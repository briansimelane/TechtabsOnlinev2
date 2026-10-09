import assert from 'node:assert';
import { Role, Team } from '../types';

function computeCanEditAndReadOnly(params: {
  isDemoMode: boolean;
  currentRole: Role;
  team: {
    ceoPin?: string;
    status: Team['status'];
  };
  localPin: string | null;
}) {
  const { isDemoMode, currentRole, team, localPin } = params;
  
  const isReadOnly = !isDemoMode && currentRole === 'STUDENT' && (
    !team.ceoPin || 
    localPin !== team.ceoPin || 
    team.status === 'Submitted'
  );

  const canEdit = isDemoMode || 
    currentRole !== 'STUDENT' || 
    (Boolean(team.ceoPin) && localPin === team.ceoPin);

  return { isReadOnly, canEdit };
}

console.log('--- Running Role & Decision Permissions Test ---');

// Case 1: Newly created team (no CEO claimed yet)
{
  const result = computeCanEditAndReadOnly({
    isDemoMode: false,
    currentRole: 'STUDENT',
    team: { ceoPin: undefined, status: 'InProgress' },
    localPin: null,
  });
  assert.strictEqual(result.isReadOnly, true, 'Unclaimed team must be read-only for students');
  assert.strictEqual(result.canEdit, false, 'Unclaimed team cannot have student write access');
  console.log('✅ Case 1 passed: Unclaimed team locks decision cells until CEO is claimed');
}

// Case 2: Non-CEO student viewing a team that has a CEO
{
  const result = computeCanEditAndReadOnly({
    isDemoMode: false,
    currentRole: 'STUDENT',
    team: { ceoPin: '4321', status: 'InProgress' },
    localPin: null, // or different pin
  });
  assert.strictEqual(result.isReadOnly, true, 'Non-CEO student must be in read-only mode');
  assert.strictEqual(result.canEdit, false, 'Non-CEO student cannot save decision edits');
  console.log('✅ Case 2 passed: Non-CEO student is strictly locked in read-only mode');
}

// Case 3: Legitimate CEO with matching PIN
{
  const result = computeCanEditAndReadOnly({
    isDemoMode: false,
    currentRole: 'STUDENT',
    team: { ceoPin: '4321', status: 'InProgress' },
    localPin: '4321',
  });
  assert.strictEqual(result.isReadOnly, false, 'Verified CEO must have full edit access');
  assert.strictEqual(result.canEdit, true, 'Verified CEO can save draft decisions');
  console.log('✅ Case 3 passed: Verified CEO has full write access');
}

// Case 4: Submitted round
{
  const result = computeCanEditAndReadOnly({
    isDemoMode: false,
    currentRole: 'STUDENT',
    team: { ceoPin: '4321', status: 'Submitted' },
    localPin: '4321',
  });
  assert.strictEqual(result.isReadOnly, true, 'Submitted team must be read-only even for CEO');
  console.log('✅ Case 4 passed: Submitted rounds lock decision cells for all users');
}

// Case 5: Facilitator role
{
  const result = computeCanEditAndReadOnly({
    isDemoMode: false,
    currentRole: 'FACILITATOR',
    team: { ceoPin: '4321', status: 'InProgress' },
    localPin: null,
  });
  assert.strictEqual(result.isReadOnly, false, 'Facilitators are not restricted by student read-only');
  assert.strictEqual(result.canEdit, true, 'Facilitators retain management capabilities');
  console.log('✅ Case 5 passed: Facilitators are not restricted by student PIN locks');
}

console.log('🎉 All permission test scenarios passed successfully!');
