import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
	apiKey: "AIzaSyCsqHryZ5-oL_6hz06g4KFuIjpAC1nyhtU",
	authDomain: "techtabssim.firebaseapp.com",
	projectId: "techtabssim",
	storageBucket: "techtabssim.firebasestorage.app",
	messagingSenderId: "63556623298",
	appId: "1:63556623298:web:c56238f8601c627dc0d45b",
	measurementId: "G-LHPW399Z6R"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const getAppAuth = () => getAuth(app);
export const getAppDb = () => getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const getAppAnalytics = async () => {
	if (typeof window === 'undefined') {
		return null;
	}
	const supported = await isSupported();
	return supported ? getAnalytics(app) : null;
};

export default app;