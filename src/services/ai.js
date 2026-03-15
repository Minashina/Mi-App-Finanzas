import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API client using the environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY is missing from environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "API_KEY_NOT_FOUND");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Fast and cheap model ideal for this task

export const getFinancialAdvice = async (financialSummary) => {
  if (!API_KEY) {
    throw new Error("No se encontró la clave de la API de Gemini. Configura VITE_GEMINI_API_KEY en tu archivo .env.local");
  }

  const prompt = `
    Eres un asesor financiero experto, amigable y directo. Te daré un resumen de las finanzas del usuario de ESTE MES.
    
    Tu tarea es:
    1. Analizar los datos.
    2. Proporcionar EXACTAMENTE 3 consejos cortos, prácticos y accionables.
    3. Cada consejo debe empezar con un emoji representativo y estar en formato de lista Markdown.
    4. NO des introducciones largas "¡Hola!, claro que sí", NO des conclusiones al final ("Espero que te sirva").
    5. Solo responde con los 3 puntos de la viñeta, yendo directo al grano. Habla en español de México/Latam.

    DATOS DEL MES ACTUAL:
    - Saldo Disponible en Débito/Efectivo: $${financialSummary.realAvailableBalance}
    - Deuda Total a Pagar este Mes: $${financialSummary.totalToPayThisMonth}
    - Dinero Ahorrado (metas): $${financialSummary.totalSaved}
    - Fondo de Emergencia: $${financialSummary.totalEmergencyFund}
    
    DETALLES DE TARJETAS DE CRÉDITO:
    - Uso promedio del límite de crédito: ${Math.round(financialSummary.avgCreditUsage)}%
    
    CATEGORÍAS DE GASTO MÁS FUERTES DE ESTE MES:
    ${financialSummary.topCategories.map(c => `- ${c.name}: $${c.amount}`).join('\n')}
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return responseText;
  } catch (error) {
    console.error("Error from Gemini API:", error);
    throw new Error("Lo siento, no pude conectar con el asesor IA en este momento. Inténtalo más tarde.");
  }
};
