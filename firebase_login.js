// firebase_login.js - Configuração do Firebase para autenticação
// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
  authDomain: "spdv-3872a.firebaseapp.com",
  projectId: "spdv-3872a",
  storageBucket: "spdv-3872a.firebasestorage.app",
  messagingSenderId: "552499245950",
  appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar para uso em login.js
export { db, collection, getDocs, doc, getDoc };