// lojas/pangua/firebase_pangua.js - Configuração específica para a loja Panguá
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Mesma configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
  authDomain: "spdv-3872a.firebaseapp.com",
  projectId: "spdv-3872a",
  storageBucket: "spdv-3872a.firebasestorage.app",
  messagingSenderId: "552499245950",
  appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
};

// Inicializar Firebase (pode ser a mesma instância ou diferente)
const app = initializeApp(firebaseConfig, 'pangua-app'); // Nome diferente para evitar conflito
const db = getFirestore(app);

// Exportar para uso em home.js da loja pangua
export { db };