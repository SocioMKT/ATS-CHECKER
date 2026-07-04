import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import mammoth from "mammoth";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is missing.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

function robustParseJson(text: string): any {
  let cleaned = text.trim();
  // Remove markdown code block wraps if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "");
    cleaned = cleaned.replace(/\n?```$/, "");
    cleaned = cleaned.trim();
  }
  return JSON.parse(cleaned);
}

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// API: Evaluate CV against Job Description
app.post("/api/evaluate", async (req, res) => {
  try {
    const { jobDescription, cvText, fileBase64, fileMimeType, fileName } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        error: "Falta la descripción de la vacante (jobDescription).",
      });
    }

    if (!cvText && !fileBase64) {
      return res.status(400).json({
        error: "Se requiere un texto de CV o un archivo cargado.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "La API Key de Gemini no está configurada. Por favor, añádela en Settings > Secrets.",
      });
    }

    let cvContentText = cvText || "";

    // Parse Word DOCX if uploaded
    if (fileBase64 && (fileMimeType?.includes("wordprocessingml") || fileMimeType?.includes("msword") || fileName?.endsWith(".docx") || fileName?.endsWith(".doc"))) {
      try {
        const buffer = Buffer.from(fileBase64, "base64");
        const docResult = await mammoth.extractRawText({ buffer });
        cvContentText = docResult.value || "";
      } catch (err: any) {
        console.error("Error parsing DOCX with mammoth:", err);
      }
    }

    // Parse plain text if uploaded
    if (fileBase64 && (fileMimeType?.includes("text/plain") || fileName?.endsWith(".txt") || fileName?.endsWith(".md"))) {
      try {
        cvContentText = Buffer.from(fileBase64, "base64").toString("utf-8");
      } catch (err: any) {
        console.error("Error decoding plain text file:", err);
      }
    }

    const systemInstruction = `
Eres un reclutador técnico senior de Estados Unidos y un experto en optimización de filtros ATS (Applicant Tracking Systems). Tu único objetivo es evaluar si el CV de un candidato de LATAM pasará los filtros automatizados y humanos para un puesto remoto en USA, basándote exclusivamente en la descripción del trabajo (Job Description) provista.

Debes comunicarte en un español muy simple, directo, empático y libre de tecnicismos complejos. El usuario debe entender qué cambiar en menos de 2 minutos.

Tu evaluación debe seguir estrictamente estas reglas de negocio:
1. Analiza las palabras clave, habilidades técnicas, años de experiencia e impacto cuantitativo requeridos en el Job Description.
2. Compara el CV contra esos requerimientos.
3. Identifica errores comunes de CVs de LATAM que no funcionan en USA (ej. incluir foto, fecha de nacimiento, estado civil, o enfocarse en tareas en lugar de logros con métricas).

Debes extraer conscientemente la información real del candidato para mostrar una vista previa interactiva y honesta de su CV actual.

Debes devolver la respuesta en formato JSON estructurado con los siguientes campos obligatorios:
{
  "pasaFiltro": boolean, // true si la puntuación es superior al 80%, false en caso contrario
  "puntuacion": number, // porcentaje del 0 al 100 de qué tan alineado está el CV con la vacante
  "palabrasClaveFaltantes": string[], // Lista de términos específicos del Job Description que el candidato debe agregar a su experiencia
  "impactoYLogros": [
    {
      "original": string, // Parte del CV original que suena a lista de tareas/responsabilidades simples
      "sugerencia": string, // Cómo convertirla en un logro con métricas y números al estilo USA
      "explicacion": string // Explicación breve de por qué es importante el cambio
    }
  ],
  "alertasRojas": string[], // Alertas como foto, dirección, edad, estado civil, mal formato ATS, etc.
  "textoRespuestaObligatoria": string, // El texto de respuesta exactamente con la estructura de markdown obligatoria que se te pide a continuación.
  "parsedName": string, // Nombre real del candidato extraído de su CV original (ej: "Rodrigo Alvarado")
  "parsedTitle": string, // Título profesional actual/deseado real del candidato extraído del CV (ej: "Paid Media Manager")
  "parsedContactInfo": string, // Resumen de los datos de contacto/ubicación/información personal real del candidato que subió (ej: "Perú • +51 977152509 • rodrigoalto25@gmail.com • Casado • Nacimiento: 12 de Marzo")
  "parsedSummary": string, // Breve resumen, extracto o perfil profesional real del candidato extraído de su CV original (máximo 2-3 líneas)
  "parsedExperiences": [
    {
      "companyAndRole": string, // Nombre de la empresa y rol desempeñado, ej: "Haley Marketing Group - Paid Media Manager"
      "bullets": string[] // Las viñetas de tareas/experiencias reales tal cual venían en ese puesto en su CV
    }
  ],
  "parsedSkills": string[], // Habilidades y tecnologías reales listadas en el CV original del candidato
  "extractedCvText": string // El texto completo y crudo que extrajiste de este currículum (o el mismo texto de entrada si ya era texto), el cual servirá para futuras optimizaciones.
}

Estructura de Respuesta Obligatoria para el campo 'textoRespuestaObligatoria':

### 1. Estado del Filtro
[Coloca ÚNICAMENTE "✅ PASA EL FILTRO ATS" si el CV cumple con más del 80% de los requisitos clave, o "❌ NO PASA EL FILTRO ATS" si necesita cambios importantes. No uses términos medios].

### 2. Puntuación Estimada de Coincidencia
[Muestra un porcentaje del 0% al 100% de qué tan alineado está el CV con la vacante, ej: 65%]

### 3. Feedback para Optimizar (Solo si no pasa o si tiene puntos críticos de mejora)
Divide tus recomendaciones en viñetas simples y accionables bajo estos tres pilares si aplica:
* 🔑 Palabras Clave Faltantes: (Lista de términos específicos del Job Description que el candidato debe agregar a su experiencia).
* 📊 Impacto y Logros: (Indica qué partes del CV suenan a \"lista de tareas\" y cómo convertirlas en logros con números o métricas al estilo USA).
* 🚫 Alertas Rojas del Mercado USA: (Si el CV tiene foto, información personal excesiva, o mal formato para ATS, indícalo claramente aquí para que lo elimine).

### 4. Siguiente Paso
"Si realizas los cambios, vuelve a pegar tu CV actualizado aquí abajo para revisarlo nuevamente hasta que logremos el check verde (✅)."
`;

    const contents: any[] = [];

    if (fileBase64 && (fileMimeType === "application/pdf" || fileName?.endsWith(".pdf"))) {
      contents.push({
        inlineData: {
          data: fileBase64,
          mimeType: "application/pdf"
        }
      });
    }

    let userPrompt = `[JOB DESCRIPTION]:\n${jobDescription}\n\n`;

    if (cvContentText && cvContentText.trim()) {
      userPrompt += `[CV CANDIDATO]:\n${cvContentText}\n`;
    } else {
      userPrompt += `[CV CANDIDATO EN ARCHIVO PDF ADJUNTO. Por favor, lee, analiza y extrae el texto de este archivo PDF.]\n`;
    }

    contents.push({
      text: userPrompt
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pasaFiltro: { type: Type.BOOLEAN },
            puntuacion: { type: Type.INTEGER },
            palabrasClaveFaltantes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            impactoYLogros: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  sugerencia: { type: Type.STRING },
                  explicacion: { type: Type.STRING },
                },
                required: ["original", "sugerencia", "explicacion"],
              },
            },
            alertasRojas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            textoRespuestaObligatoria: { type: Type.STRING },
            parsedName: { type: Type.STRING },
            parsedTitle: { type: Type.STRING },
            parsedContactInfo: { type: Type.STRING },
            parsedSummary: { type: Type.STRING },
            parsedExperiences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  companyAndRole: { type: Type.STRING },
                  bullets: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["companyAndRole", "bullets"],
              },
            },
            parsedSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            extractedCvText: { type: Type.STRING },
          },
          required: [
            "pasaFiltro",
            "puntuacion",
            "palabrasClaveFaltantes",
            "impactoYLogros",
            "alertasRojas",
            "textoRespuestaObligatoria",
            "parsedName",
            "parsedTitle",
            "parsedContactInfo",
            "parsedSummary",
            "parsedExperiences",
            "parsedSkills",
            "extractedCvText",
          ],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No se recibió respuesta del modelo Gemini.");
    }

    const parsedResult = robustParseJson(responseText);
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Error evaluating CV:", error);
    res.status(500).json({
      error: "Error interno al procesar la evaluación.",
      details: error?.message || String(error),
    });
  }
});

// API: Improve a specific CV bullet point
app.post("/api/improve-bullet", async (req, res) => {
  try {
    const { bullet, jobDescription } = req.body;

    if (!bullet) {
      return res.status(400).json({ error: "El texto de la viñeta ('bullet') es requerido." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "La API Key de Gemini no está configurada.",
      });
    }

    const systemInstruction = `
Eres un reclutador técnico senior de Estados Unidos y experto en optimización de CVs para ATS.
Tu tarea es tomar una viñeta/frase simple de un CV de un candidato (que usualmente describe una tarea rutinaria) y reescribirla en 3 versiones diferentes y de alta calidad que se enfoquen en LOGROS con IMPACTO cuantitativo (métrica/números/porcentajes) al estilo USA.
Si no hay números provistos, inventa métricas realistas y plausibles que representen un impacto positivo común en ese rol (p. ej., "reducir tiempos en 20%", "mejorar performance en 15%", "liderar equipo de 4 personas") y colócalas entre corchetes para que el candidato sepa que debe editarlas con sus propios números, o ponlas directamente explicando que es un ejemplo para rellenar.

Devuelve la respuesta en formato JSON con la siguiente estructura:
{
  "mejoras": [
    {
      "version": string, // La viñeta mejorada en inglés (los CVs para USA deben ser en inglés) o español (según el idioma de la viñeta del usuario, pero preferiblemente ofrece la versión en inglés ya que es para puestos remotos en USA, y agrega una traducción). Hazla sonar profesional y fuerte.
      "explicacion": string // Breve explicación de por qué esta versión funciona mejor frente a un ATS y reclutadores de USA.
    }
  ]
}
`;

    const userPrompt = `
Viñeta original a mejorar: "${bullet}"
Contexto de la descripción del trabajo (opcional): "${jobDescription || 'No provisto'}"
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mejoras: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  version: { type: Type.STRING },
                  explicacion: { type: Type.STRING },
                },
                required: ["version", "explicacion"],
              },
            },
          },
          required: ["mejoras"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No se recibió respuesta del modelo Gemini.");
    }

    const parsedResult = robustParseJson(responseText);
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Error improving bullet:", error);
    res.status(500).json({
      error: "Error interno al mejorar la viñeta.",
      details: error?.message || String(error),
    });
  }
});

// API: Generate fully optimized CV draft for Paso 3
app.post("/api/generate-optimized-cv", async (req, res) => {
  try {
    const { jobDescription, cvText } = req.body;

    if (!jobDescription || !cvText) {
      return res.status(400).json({
        error: "Se requiere 'jobDescription' y 'cvText' para generar la optimización total.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "La API Key de Gemini no está configurada.",
      });
    }

    const systemInstruction = `
Eres un reclutador técnico senior de Estados Unidos y experto en redactar CVs exitosos y de alto impacto para el mercado americano.
Tu tarea es tomar el CV de un candidato de LATAM (usualmente con debilidades en el formato, datos personales excesivos y descripción pasiva de tareas) y generar una versión mejorada impecable en inglés.

CRÍTICO - FORMATO REQUERIDO (Estilo Harvard Business School Resume):
Debes formatear el campo "optimizedCvDraft" estrictamente en Markdown elegante con el siguiente esquema clássico de Harvard:

# NOMBRE COMPLETO
Ciudad, País | Teléfono | Correo Electrónico | Enlace a LinkedIn

## PROFESSIONAL SUMMARY
---
[Un párrafo corto de 3-4 líneas extremadamente potente, orientado a resultados, alineado al Job Description provisto, usando verbos de acción fuertes.]

## CORE COMPETENCIES & TECH STACK
---
- **Paid Acquisition / Marketing**: Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, B2B Sourcing, B2C Funnels
- **Tools & Automation**: Zapier, GoHighLevel, HubSpot, Google Analytics 4
- **Strategic Areas**: Growth Operations, Performance Marketing, A/B Testing, Funnel Optimization

## PROFESSIONAL EXPERIENCE
---
**Nombre de la Empresa** – *Ubicación (o Remote)*
**Título del Puesto / Rol** – *Fecha Inicio – Fecha Fin (ej. Jan 2021 – Present)*
- [Logro cuantificable 1] Empezar con verbo de acción fuerte (ej. "Led", "Engineered", "Scaled", "Optimized") + Tarea + Impacto numérico concreto (porcentaje, dinero en USD, cantidad de leads, ROI, ROAS, etc.).
- [Logro cuantificable 2] Empezar con verbo fuerte + Logro medible.
- [Logro cuantificable 3] ...

**Siguiente Empresa** – *Ubicación*
**Título del Puesto / Rol** – *Fecha Inicio – Fecha Fin*
- [Logro cuantificable 1]...

## EDUCATION
---
**Nombre del Título / Carrera** – *Nombre de la Universidad, Ciudad, País*
*Año de Graduación*

REGLAS DE FORMATO CRÍTICAS:
1. IDIOMA: Todo el borrador de CV ("optimizedCvDraft") debe estar estrictamente en INGLÉS (el estándar de EE.UU.).
2. NINGUNA INFORMACIÓN DISCRIMINATORIA: Elimina por completo fotos, estado civil, fecha de nacimiento, edad, género o dirección exacta.
3. NUEVAS LÍNEAS REALES: Absolutamente NUNCA generes secuencias de caracteres literales como "\\N" o "\\n" en el texto. En su lugar, usa saltos de línea reales de Markdown (pulsando Enter). El texto debe ser fácil de parsear con split("\\n").
4. SIN CENTRAR: No agregues etiquetas HTML de centrado. El formato Markdown básico es suficiente.

Devuelve la respuesta en formato JSON con la siguiente estructura exacta:
{
  "optimizedCvDraft": string, // Borrador de CV con formato Harvard Resume en inglés
  "summaryOfImprovements": string // Breve resumen amigable en español de los cambios clave aplicados
}
`;

    const userPrompt = `
[JOB DESCRIPTION]:
${jobDescription}

[CV ORIGINAL DE LATAM]:
${cvText}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedCvDraft: { type: Type.STRING },
            summaryOfImprovements: { type: Type.STRING },
          },
          required: ["optimizedCvDraft", "summaryOfImprovements"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No se recibió respuesta del modelo Gemini.");
    }

    const parsedResult = robustParseJson(responseText);
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Error generating optimized CV:", error);
    res.status(500).json({
      error: "Error interno al optimizar el CV completo.",
      details: error?.message || String(error),
    });
  }
});

// API: Download optimized CV as Word Document (.doc)
app.post("/api/download-docx", (req, res) => {
  try {
    const { cvDraftMarkdown, fileName } = req.body;

    if (!cvDraftMarkdown) {
      return res.status(400).json({ error: "El borrador de CV en Markdown es requerido." });
    }

    // Sanitize any literal \N or \n character sequences
    let bodyContent = cvDraftMarkdown
      .replace(/\\N/gi, "\n")
      .replace(/\\n/gi, "\n")
      .replace(/\\r/gi, "")
      .trim();

    // Remove HTML entities safely
    bodyContent = bodyContent
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace bold text: **text**
    bodyContent = bodyContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Replace headings
    bodyContent = bodyContent.replace(/^#\s+(.*?)$/gm, "<h1>$1</h1>");
    bodyContent = bodyContent.replace(/^##\s+(.*?)$/gm, "<h2>$1</h2>");
    bodyContent = bodyContent.replace(/^###\s+(.*?)$/gm, "<h3>$1</h3>");

    // Replace horizontal dividers if any
    bodyContent = bodyContent.replace(/^---\s*$/gm, "<hr />");

    // Replace lists
    const lines = bodyContent.split("\n");
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("* ") || line.startsWith("- ")) {
        const content = line.substring(2).trim();
        if (!inList) {
          lines[i] = "<ul><li>" + content + "</li>";
          inList = true;
        } else {
          lines[i] = "<li>" + content + "</li>";
        }
      } else {
        if (inList) {
          lines[i - 1] = lines[i - 1] + "</ul>";
          inList = false;
        }
        if (line !== "" && !line.startsWith("<h") && !line.startsWith("<ul") && !line.startsWith("<li") && !line.startsWith("<hr")) {
          // If it is in the top header section, style it beautifully
          if (i < 8 && (line.includes("|") || line.includes("@") || line.includes("•"))) {
            lines[i] = '<p class="header-details">' + line + "</p>";
          } else {
            lines[i] = "<p>" + line + "</p>";
          }
        }
      }
    }
    if (inList) {
      lines[lines.length - 1] = lines[lines.length - 1] + "</ul>";
    }

    bodyContent = lines.join("\n");

    const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Harvard Resume Draft</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 8.5in 11in;
    margin: 0.8in 0.8in 0.8in 0.8in;
    mso-header-margin: 0.5in;
    mso-footer-margin: 0.5in;
    mso-paper-source: 0;
  }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 10.5pt;
    line-height: 1.35;
    color: #000000;
  }
  h1 {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 18pt;
    font-weight: bold;
    color: #000000;
    text-align: center;
    margin-top: 0px;
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .header-details {
    text-align: center;
    font-size: 9pt;
    color: #444444;
    margin-bottom: 12pt;
    margin-top: 0px;
    font-family: Arial, sans-serif;
  }
  h2 {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11pt;
    font-weight: bold;
    color: #000000;
    border-bottom: 1.5px solid #000000;
    padding-bottom: 1px;
    margin-top: 18pt;
    margin-bottom: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  h3 {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 10.5pt;
    font-weight: bold;
    color: #000000;
    margin-top: 8pt;
    margin-bottom: 2pt;
  }
  p {
    margin: 0 0 5pt 0;
  }
  ul {
    margin: 0 0 8pt 0;
    padding-left: 18pt;
  }
  li {
    margin-bottom: 3pt;
  }
  hr {
    border: none;
    border-top: 1.5px solid #000000;
    margin: 12pt 0;
  }
</style>
</head>
<body>
  ${bodyContent}
</body>
</html>
`;

    const downloadName = fileName || "cv_optimizado_usa.doc";
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.setHeader("Content-Type", "application/msword; charset=utf-8");
    return res.send(Buffer.from(wordHtml, "utf-8"));
  } catch (error: any) {
    console.error("Error generating DOC file:", error);
    res.status(500).json({ error: "No se pudo generar el archivo de Word." });
  }
});

// Start server function and setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
