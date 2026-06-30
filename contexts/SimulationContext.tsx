
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth';
import { SimulationState, TurnDecisions, Role, SimulationClass, Team, Facilitator, NegotiationMessage, MarketEvent, SurveyConfig, SurveyResponse } from '../types';
import { INITIAL_STATE, INITIAL_DECISIONS, SUPPLIER_METRICS, DEFAULT_SURVEY_CONFIG } from '../constants';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { processTurn } from '../utils/SimulationEngine';
import { formatNumber } from '../utils/numberFormat';
import { getAppAuth, googleProvider } from '../firebase';
import {
    deleteClassById,
    deleteFacilitatorById,
    getUserProfile,
    listClasses,
    saveClass,
    saveFacilitator,
    saveTeamState,
    upsertUserProfile
} from '../utils/firestoreHelpers';

// Mock User interface
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface SimulationContextType extends SimulationState {
  setRole: (role: Role) => void;
  updateDecisions: (section: keyof TurnDecisions, data: Partial<TurnDecisions[keyof TurnDecisions]>) => void;
  submitTurn: () => void;
  login: (code: string) => Promise<{ success: boolean; message?: string; role?: Role }>;
    loginWithGoogle: () => Promise<{ role: Role } | null>;
  logout: () => void;
  createClass: (name: string, teamCount: number) => void;
  deleteClass: (classId: string) => void;
  selectClass: (classId: string) => void;
  addFacilitator: (facilitator: Omit<Facilitator, 'id' | 'joinedDate'>) => void;
  removeFacilitator: (id: string) => void;
  currentUser: User | null;
  // Negotiation Actions
  startNegotiation: (supplierId: string) => Promise<void>;
  sendNegotiationMessage: (message: string) => Promise<void>;
  updateClassNegotiationConfig: (classId: string, period: number, supplierId: string, instruction: string) => void;
  // Facilitator Actions
  injectMarketEvent: (classId: string, event: MarketEvent) => void;
  submitSurveyResponse: (answers: Record<string, number | string>) => Promise<void>;
  updateSurveyConfig: (config: SurveyConfig) => Promise<void>;
  updateClassHideSurvey: (hideSurvey: boolean) => Promise<void>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

// Helper to generate random codes
const generateCode = (prefix: string) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Initialize state with defaults
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);

    const ensureFirebaseSession = async () => {
        const auth = getAppAuth();
        if (auth.currentUser) {
            return auth.currentUser;
        }
        const result = await signInAnonymously(auth);
        return result.user;
    };

    const safeUpsertProfile = async (profile: { uid: string; email: string | null; displayName: string | null; role: Role; currentClassId: string | null; }) => {
        try {
            await upsertUserProfile(profile);
        } catch (error) {
            console.warn('Failed to write user profile. Proceeding without Firestore persistence.', error);
        }
    };

    useEffect(() => {
        const auth = getAppAuth();
        
        // Load classes from Firestore on mount
        const loadClasses = async () => {
            try {
                const dbClasses = await listClasses();
                setState(prev => ({ ...prev, classes: dbClasses }));
            } catch (err) {
                console.error("Failed to load classes from Firestore on mount", err);
            }
        };
        void loadClasses();

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setCurrentUser(null);
                setState(prev => ({ ...prev, isAuthenticated: false }));
                return;
            }

            const profile = await getUserProfile(user.uid);
            const displayName = profile?.displayName ?? user.displayName ?? null;
            const email = profile?.email ?? user.email ?? null;

            setCurrentUser({ uid: user.uid, email, displayName });

            if (profile?.role) {
                setState(prev => ({
                    ...prev,
                    isAuthenticated: true,
                    currentRole: profile.role,
                    originalRole: profile.role,
                    currentClassId: profile.currentClassId ?? prev.currentClassId
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    isAuthenticated: true,
                    currentRole: 'STUDENT',
                    originalRole: 'STUDENT'
                }));
            }
        });

        return () => unsubscribe();
    }, []);

  const setRole = (role: Role) => {
    setState((prev) => ({ ...prev, currentRole: role }));
  };

  const updateDecisions = (section: keyof TurnDecisions, data: any) => {
    setState((prev) => ({
      ...prev,
      decisions: {
        ...prev.decisions,
        [section]: {
          ...prev.decisions[section],
          ...data,
        },
      },
    }));
  };

  const submitTurn = () => {
    // 1. Get current events for the active class
    const currentClass = state.classes.find(c => c.id === state.currentClassId);
    const activeEvents = currentClass?.activeEvents?.filter(e => e.activePeriod === state.currentTeam.currentPeriod) || [];

    // 2. Run the Simulation Engine
    const result = processTurn(state.currentTeam, state.decisions, activeEvents);

        if (state.currentClassId) {
            void saveTeamState(state.currentClassId, result.newTeamState).catch((error) => {
                console.error('Failed to save team state', error);
            });
        }

    // 3. Update State
    setState(prev => ({
        ...prev,
        currentTeam: result.newTeamState,
        lastPeriodKPIs: result.kpis,
        // Reset decisions for next turn to sensible defaults or keep previous
        decisions: {
            ...prev.decisions,
            negotiation: { ...INITIAL_DECISIONS.negotiation } // Reset negotiation status
        }
    }));

    alert(`Turn Processed! 
        Revenue: R ${formatNumber(result.kpis.revenue/1000000, 0)}M 
        Profit: R ${formatNumber(result.kpis.netProfit/1000000, 0)}M`);
  };

  const updateClassNegotiationConfig = (classId: string, period: number, supplierId: string, instruction: string) => {
      setState(prev => ({
          ...prev,
          classes: prev.classes.map(c => {
              if (c.id === classId) {
                  return {
                      ...c,
                      negotiationOverrides: {
                          ...c.negotiationOverrides,
                          [period]: {
                              ...(c.negotiationOverrides?.[period] || {}),
                              [supplierId]: instruction
                          }
                      }
                  };
              }
              return c;
          })
      }));
  };

  const injectMarketEvent = (classId: string, event: MarketEvent) => {
      setState(prev => ({
          ...prev,
          classes: prev.classes.map(c => {
              if (c.id === classId) {
                  return {
                      ...c,
                      activeEvents: [...(c.activeEvents || []), event]
                  };
              }
              return c;
          })
      }));
  };

  // --- AI Negotiation Logic ---

  const finalizeDealFunction: FunctionDeclaration = {
    name: 'finalizeDeal',
    parameters: {
      type: Type.OBJECT,
      description: 'Call this function when the user and the supplier have agreed on terms to finalize the deal.',
      properties: {
        discountPercent: {
          type: Type.NUMBER,
          description: 'The agreed discount percentage (0 to 0.15).',
        },
        paymentTerms: {
          type: Type.NUMBER,
          description: 'The agreed payment terms in days (e.g. 30, 45, 60, 90).',
        },
      },
      required: ['discountPercent', 'paymentTerms'],
    },
  };

  const startNegotiation = async (supplierId: string) => {
    // 1. Reset negotiation state for the selected supplier
    setState(prev => ({
        ...prev,
        decisions: {
            ...prev.decisions,
            negotiation: {
                selectedSupplierId: supplierId,
                status: 'IN_PROGRESS',
                agreedDiscount: 0,
                agreedPaymentTerms: 0,
                transcript: []
            }
        }
    }));

    // 2. Trigger initial message
    await sendNegotiationMessage(`Hello, I am interested in establishing a preferred supplier agreement with ${supplierId}.`);
  };

  const sendNegotiationMessage = async (userMessage: string) => {
      // 1. Update local state with user message
      setState(prev => {
          const newTranscript = [...prev.decisions.negotiation.transcript];
          // Only add user message if it's not the system init trigger
          if (!userMessage.includes("Hello, I am interested")) {
              newTranscript.push({ role: 'user', text: userMessage });
          }
          return {
              ...prev,
              decisions: {
                  ...prev.decisions,
                  negotiation: {
                      ...prev.decisions.negotiation,
                      transcript: newTranscript
                  }
              }
          };
      });

      // 2. Call Gemini
      try {
          if (!process.env.API_KEY) {
              console.warn("No API Key found. Negotiation AI disabled.");
              setTimeout(() => {
                 setState(prev => ({
                     ...prev,
                     decisions: {
                         ...prev.decisions,
                         negotiation: {
                             ...prev.decisions.negotiation,
                             transcript: [...prev.decisions.negotiation.transcript, { role: 'model', text: "API Key missing. Please configure environment to enable AI negotiation." }]
                         }
                     }
                 }));
              }, 500);
              return;
          }

          const supplierId = state.decisions.negotiation.selectedSupplierId || 'Alpha';
          // @ts-ignore
          const metrics = SUPPLIER_METRICS[supplierId];
          let systemPrompt = `You are a procurement negotiator representing ${supplierId}. 
          Your Traits: ${metrics.desc}
          Your Stats: Quality ${metrics.quality}/10, Service ${metrics.service}/10.
          
          Goal: Negotiate a contract with the user (a student running a tech company). 
          - Max discount you can offer: 15% (0.15). Start at 0%.
          - Max payment terms: 90 days. Start at ${metrics.terms} days.
          - Be professional but tough. Do not give away discounts without getting volume commitments or long-term promises.
          - If the user agrees to terms, CALL the 'finalizeDeal' tool immediately.
          - Keep responses concise (under 50 words).`;

          // Inject Facilitator Overrides
          const currentClass = state.classes.find(c => c.id === state.currentClassId);
          if (currentClass && currentClass.negotiationOverrides) {
              const currentPeriod = state.currentTeam.currentPeriod;
              const override = currentClass.negotiationOverrides[currentPeriod]?.[supplierId];
              
              if (override) {
                  systemPrompt += `\n\n*** IMPORTANT INSTRUCTIONS FROM GAME MASTER ***\nFor this specific negotiation, adhere to the following special condition: ${override}\n\nAdjust your attitude and constraints accordingly.`;
              }
          }

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const history = state.decisions.negotiation.transcript.map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
          }));

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
              config: {
                  systemInstruction: systemPrompt,
                  tools: [{ functionDeclarations: [finalizeDealFunction] }]
              }
          });
          
          const functionCalls = response.functionCalls;
          
          if (functionCalls && functionCalls.length > 0) {
             const call = functionCalls[0];
             if (call.name === 'finalizeDeal') {
                 const args = call.args as any;
                 setState(prev => ({
                     ...prev,
                     decisions: {
                         ...prev.decisions,
                         negotiation: {
                             ...prev.decisions.negotiation,
                             status: 'AGREED',
                             agreedDiscount: args.discountPercent,
                             agreedPaymentTerms: args.paymentTerms,
                             transcript: [...prev.decisions.negotiation.transcript, { role: 'model', text: `Deal agreed! ${args.discountPercent * 100}% discount and ${args.paymentTerms} days payment terms.` }]
                         }
                     }
                 }));
                 return;
             }
          }

          const text = response.text;
          
          if (text) {
              setState(prev => ({
                  ...prev,
                  decisions: {
                      ...prev.decisions,
                      negotiation: {
                          ...prev.decisions.negotiation,
                          transcript: [...prev.decisions.negotiation.transcript, { role: 'model', text: text }]
                      }
                  }
              }));
          }

      } catch (error) {
          console.error("Negotiation Error", error);
          setState(prev => ({
             ...prev,
             decisions: {
                 ...prev.decisions,
                 negotiation: {
                     ...prev.decisions.negotiation,
                     transcript: [...prev.decisions.negotiation.transcript, { role: 'model', text: "I'm having trouble connecting to headquarters (AI Service Error). Let's continue later." }]
                 }
             }
         }));
      }
  };


  const submitSurveyResponse = async (answers: Record<string, number | string>) => {
    if (!state.currentClassId || !state.currentTeam || !currentUser) {
      console.warn("Cannot submit survey: Missing class, team, or user context.");
      return;
    }

    const newResponse: SurveyResponse = {
      userId: currentUser.uid,
      teamId: state.currentTeam.id,
      teamName: state.currentTeam.name,
      period: state.currentTeam.currentPeriod,
      timestamp: new Date().toISOString(),
      answers
    };

    setState(prev => {
      const updatedClasses = prev.classes.map(c => {
        if (c.id === prev.currentClassId) {
          const currentResponses = c.surveyResponses || [];
          // Avoid duplicate submissions by the same user in the same period
          const filteredResponses = currentResponses.filter(
            r => !(r.userId === currentUser.uid && r.period === prev.currentTeam.currentPeriod)
          );
          const updatedResponses = [...filteredResponses, newResponse];
          
          const updatedClass = {
            ...c,
            surveyResponses: updatedResponses
          };
          
          // Async save to firestore
          void saveClass(updatedClass).catch(err => console.error("Failed to save survey response to Firestore", err));
          
          return updatedClass;
        }
        return c;
      });
      return { ...prev, classes: updatedClasses };
    });
  };

  const updateSurveyConfig = async (config: SurveyConfig) => {
    if (!state.currentClassId) {
      console.warn("Cannot update survey config: No class selected.");
      return;
    }

    setState(prev => {
      const updatedClasses = prev.classes.map(c => {
        if (c.id === prev.currentClassId) {
          const updatedClass = {
            ...c,
            surveyConfig: config
          };
          
          // Async save to firestore
          void saveClass(updatedClass).catch(err => console.error("Failed to save survey config to Firestore", err));
          
          return updatedClass;
        }
        return c;
      });
      return { ...prev, classes: updatedClasses };
    });
  };

  const updateClassHideSurvey = async (hideSurvey: boolean) => {
    if (!state.currentClassId) {
      console.warn("Cannot update class settings: No class selected.");
      return;
    }

    setState(prev => {
      const updatedClasses = prev.classes.map(c => {
        if (c.id === prev.currentClassId) {
          const updatedClass = {
            ...c,
            hideSurvey
          };
          
          // Async save to firestore
          void saveClass(updatedClass).catch(err => console.error("Failed to save class hideSurvey status to Firestore", err));
          
          return updatedClass;
        }
        return c;
      });
      return { ...prev, classes: updatedClasses };
    });
  };

  const createClass = (name: string, teamCount: number) => {
    const newClassId = `class_${Date.now()}`;
    const teams: Team[] = [];
    const teamCodes: Record<string, string> = {};

    for (let i = 1; i <= teamCount; i++) {
        const teamId = `team_${i}_${newClassId}`;
        const code = generateCode(`TM${i}`);
        teamCodes[teamId] = code;
        
        teams.push({
            ...INITIAL_STATE.currentTeam,
            id: teamId,
            name: `Team ${i}`,
            universeId: newClassId
        });
    }

    const facilitatorCode = generateCode('FAC');

    const newClass: SimulationClass = {
        id: newClassId,
        name: name,
        facilitatorCode: facilitatorCode,
        currentPeriod: 1,
        teams: teams,
        teamCodes: teamCodes,
        createdAt: new Date().toISOString(),
        activeEvents: [],
        surveyConfig: DEFAULT_SURVEY_CONFIG,
        surveyResponses: []
    };

        void saveClass(newClass).catch((error) => {
            console.error('Failed to save class', error);
        });

    setState(prev => ({
        ...prev,
        classes: [...prev.classes, newClass]
    }));
  };

  const deleteClass = (classId: string) => {
      setState(prev => ({
        ...prev,
        classes: prev.classes.filter(c => c.id !== classId)
      }));

            void deleteClassById(classId).catch((error) => {
                console.error('Failed to delete class', error);
            });
  };

  const selectClass = (classId: string) => {
      setState(prev => ({ ...prev, currentClassId: classId }));
  };

  // --- Facilitator Management (Local State) ---

  const addFacilitator = (facilitatorData: Omit<Facilitator, 'id' | 'joinedDate'>) => {
    const newId = `fac_${Date.now()}`;
    const newFacilitator: Facilitator = {
        ...facilitatorData,
        id: newId,
        joinedDate: new Date().toISOString().split('T')[0]
    };
    
    setState(prev => ({
        ...prev,
        facilitators: [...prev.facilitators, newFacilitator]
    }));

        void saveFacilitator(newFacilitator).catch((error) => {
            console.error('Failed to save facilitator', error);
        });
  };

  const removeFacilitator = (id: string) => {
      setState(prev => ({
        ...prev,
        facilitators: prev.facilitators.filter(f => f.id !== id)
      }));

            void deleteFacilitatorById(id).catch((error) => {
                console.error('Failed to delete facilitator', error);
            });
  };

  // --- Auth (Mock) ---

    const loginWithGoogle = async (): Promise<{ role: Role } | null> => {
            const auth = getAppAuth();
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const existingProfile = await getUserProfile(user.uid);
            const role = existingProfile?.role ?? 'STUDENT';
            const currentClassId = existingProfile?.currentClassId ?? null;

            await upsertUserProfile({
                uid: user.uid,
                email: user.email ?? null,
                displayName: user.displayName ?? null,
                role,
                currentClassId
            });

            setCurrentUser({ uid: user.uid, email: user.email, displayName: user.displayName });
            setState(prev => ({
                ...prev,
                isAuthenticated: true,
                currentRole: role,
                originalRole: role,
                currentClassId: currentClassId ?? prev.currentClassId
            }));

            return { role };
    };

  const login = async (code: string): Promise<{ success: boolean; message?: string; role?: Role }> => {
    // 1. Ensure Firebase Auth session first so we have read permissions
    let authUser = null;
    try {
        authUser = await ensureFirebaseSession();
    } catch (error) {
        console.warn('Anonymous auth failed. Using local session only.', error);
    }

    // 2. Fetch classes from Firestore if not already loaded in local state
    let activeClasses = state.classes;
    if (activeClasses.length === 0) {
        try {
            activeClasses = await listClasses();
            setState(prev => ({ ...prev, classes: activeClasses }));
        } catch (err) {
            console.error("Failed to load classes from Firestore in login flow", err);
        }
    }

    if (code === 'ADMIN-MASTER') {
        const displayName = 'System Admin';
        setCurrentUser({ uid: authUser?.uid || 'admin-local', email: authUser?.email ?? 'admin@techtabs.com', displayName });
        setState(prev => ({
            ...prev,
            isAuthenticated: true,
            currentRole: 'ADMIN',
            originalRole: 'ADMIN',
            currentClassId: null
        }));

        if (authUser) {
            await safeUpsertProfile({
                uid: authUser.uid,
                email: authUser.email ?? 'admin@techtabs.com',
                displayName,
                role: 'ADMIN',
                currentClassId: null
            });
        }
        return { success: true, role: 'ADMIN' };
    }

    if (code === 'DEMO-STUDENT') {
        const displayName = 'Demo Student';
        setCurrentUser({ uid: authUser?.uid || 'student-local', email: authUser?.email ?? 'student@demo.com', displayName });
        setState(prev => ({ ...prev, isAuthenticated: true, currentRole: 'STUDENT', originalRole: 'STUDENT' }));

        if (authUser) {
            await safeUpsertProfile({
                uid: authUser.uid,
                email: authUser.email ?? 'student@demo.com',
                displayName,
                role: 'STUDENT',
                currentClassId: state.currentClassId
            });
        }
        return { success: true, role: 'STUDENT' };
    }
    
    if (code === 'DEMO-FAC') {
        const displayName = 'Demo Facilitator';
        setCurrentUser({ uid: authUser?.uid || 'fac-local', email: authUser?.email ?? 'facilitator@demo.com', displayName });
        setState(prev => ({ ...prev, isAuthenticated: true, currentRole: 'FACILITATOR', originalRole: 'FACILITATOR' }));

        if (authUser) {
            await safeUpsertProfile({
                uid: authUser.uid,
                email: authUser.email ?? 'facilitator@demo.com',
                displayName,
                role: 'FACILITATOR',
                currentClassId: state.currentClassId
            });
        }
        return { success: true, role: 'FACILITATOR' };
    }

    // Dynamic Class Codes (search from activeClasses)
    const foundClassFac = activeClasses.find(c => c.facilitatorCode === code);
    if (foundClassFac) {
        const displayName = 'Class Facilitator';
        setCurrentUser({ uid: authUser?.uid || 'fac-class-local', email: authUser?.email ?? 'fac@class.com', displayName });
        setState(prev => ({
            ...prev,
            isAuthenticated: true,
            currentRole: 'FACILITATOR',
            originalRole: 'FACILITATOR',
            currentClassId: foundClassFac.id
        }));

        if (authUser) {
            await safeUpsertProfile({
                uid: authUser.uid,
                email: authUser.email ?? 'fac@class.com',
                displayName,
                role: 'FACILITATOR',
                currentClassId: foundClassFac.id
            });
        }
        return { success: true, role: 'FACILITATOR' };
    }

    for (const cls of activeClasses) {
        for (const [teamId, tCode] of Object.entries(cls.teamCodes)) {
            if (tCode === code) {
                const team = cls.teams.find(t => t.id === teamId);
                if (team) {
                    const displayName = 'Student User';
                    const email = `student@${team.name.replace(/\s/g, '').toLowerCase()}.com`;
                    setCurrentUser({ uid: authUser?.uid || `student-${teamId}`, email: authUser?.email ?? email, displayName });
                    setState(prev => ({
                        ...prev,
                        isAuthenticated: true,
                        currentRole: 'STUDENT',
                        originalRole: 'STUDENT',
                        currentClassId: cls.id,
                        currentTeam: team,
                        decisions: INITIAL_DECISIONS 
                    }));

                    if (authUser) {
                        await safeUpsertProfile({
                            uid: authUser.uid,
                            email: authUser.email ?? email,
                            displayName,
                            role: 'STUDENT',
                            currentClassId: cls.id
                        });
                    }
                    return { success: true, role: 'STUDENT' };
                }
            }
        }
    }

    return { success: false, message: 'Invalid Access Code' };
  };

  const logout = () => {
            const auth = getAppAuth();
            void signOut(auth).catch((error) => {
                console.error('Failed to sign out', error);
            });
            setCurrentUser(null);
            setState(prev => ({ ...prev, isAuthenticated: false }));
  };

  return (
    <SimulationContext.Provider value={{ 
        ...state, 
        setRole, 
        updateDecisions, 
        submitTurn, 
        login, 
        loginWithGoogle,
        logout,
        createClass,
        deleteClass,
        selectClass,
        addFacilitator,
        removeFacilitator,
        currentUser,
        startNegotiation,
        sendNegotiationMessage,
        updateClassNegotiationConfig,
        injectMarketEvent,
        submitSurveyResponse,
        updateSurveyConfig,
        updateClassHideSurvey
    }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
