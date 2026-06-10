import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

declare const process: {
  env: {
    LOVABLE_API_KEY?: string;
    LOVABLE_MODEL?: string;
    OPENAI_API_KEY?: string;
    AI_API_KEY?: string;
    AI_API_URL?: string;
    AI_MODEL?: string;
  };
};

// Server-side AI generation for PYQ / Sample questions.
//
// Flow:
// 1. UI submits exam/year/subject/topic/mode/count to the server function.
// 2. The server-side function calls the configured AI provider.
// 3. Provider credentials, when configured, stay on the server only.
// 4. The response is parsed as strict JSON and returned to the UI.
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const CHAT_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gpt-5.5",
  "gpt-5.5-pro",
  "gpt-5.4",
  "gpt-5.4-pro",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-5.2",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
] as const;

const CHAT_MODEL_SET = new Set<string>(CHAT_MODELS);

const normalizeChatModel = (model?: string) => (model && CHAT_MODEL_SET.has(model) ? model : undefined);

export type GeneratedQuestion = {
  question: string;
  options?: string[];
  answer?: string;
  solution?: string;
  difficulty?: string;
  year?: string;
  exam?: string;
  topic?: string;
};

type QuestionRequest = {
  mode: "pyq" | "sample";
  exam: string;
  subject: string;
  topic?: string;
  year?: string;
  count: number;
};

const normalizeSubject = (subject: string) => {
  const s = subject.toLowerCase().replace(/[^a-z]/g, "");
  if (["physcs", "phy", "physics", "phys", "physis"].includes(s)) return "physics";
  if (["math", "maths", "mathematics", "mathematics"].includes(s)) return "mathematics";
  if (["chem", "chemistry"].includes(s)) return "chemistry";
  if (["bio", "biology", "biol"].includes(s)) return "biology";
  if (["reasoning", "reasoining", "reason", "logicalreasoning", "lr", "logical"].includes(s)) return "reasoning";
  if (["english", "eng", "language", "englishlanguage", "englishlit", "englishliterature", "literature", "grammar", "comprehension"].includes(s)) return "english";
  if (["history", "his", "stories", "civics"].includes(s)) return "history";
  if (["geo", "geography", "landforms", "maps"].includes(s)) return "geography";
  if (["economics", "eco", "economy", "econ"].includes(s)) return "economics";
  if (["computer", "computerscience", "cs", "informatics", "programming"].includes(s)) return "computer science";
  if (["commerce", "businessstudies", "business", "accounting", "accounts", "finance"].includes(s)) return "commerce";
  if (["psychology", "psy"].includes(s)) return "psychology";
  if (["sociology", "socio"].includes(s)) return "sociology";
  if (["politicalscience", "politics", "polscience", "polisci"].includes(s)) return "political science";
  if (["gk", "generalawareness", "generalknowledge", "generalawareness", "generalknowledge", "general awareness", "general knowledge"].includes(s)) return "general-awareness";
  if (["aptitude", "quant", "qa", "quantitativeaptitude", "quantitative aptitude"].includes(s)) return "aptitude";
  return s || "general";
};

const dedupeQuestions = (questions: GeneratedQuestion[]) => {
  const seen = new Set<string>();
  const unique: GeneratedQuestion[] = [];
  for (const question of questions) {
    const key = question.question.trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(question);
    }
  }
  return unique;
};

const generateMathFallback = (index: number): GeneratedQuestion => {
  const templateIndex = index % 10;
  const a = 2 + (index % 9);
  const b = 3 + ((index * 2) % 7);
  const c = 4 + ((index * 3) % 6);
  const t = 2 + (index % 5);
  const speedDistance = 20 + ((index % 8) * 5);
  const speedTime = 2 + (index % 6);
  const percentBase = 10 + ((index % 6) * 5);
  const percentValue = percentBase * 1.2;
  const ratioA = 2 + ((index * 3) % 7);
  const ratioB = 3 + ((index * 5) % 8);
  const areaBase = 3 + (index % 6);
  const volumeBase = 2 + ((index + 1) % 5);

  if (templateIndex === 0) {
    const root1 = a;
    const root2 = b;
    const sum = root1 + root2;
    const product = root1 * root2;
    return {
      question: `Solve the quadratic equation x^2 - ${sum}x + ${product} = 0.`,
      answer: `x = ${root1} or x = ${root2}`,
      solution: `Factorize x^2 - ${sum}x + ${product} into (x - ${root1})(x - ${root2}). Set each factor equal to zero to get x = ${root1} or x = ${root2}.`,
      difficulty: "medium",
    };
  }

  if (templateIndex === 1) {
    const angle = 30 + ((index % 3) * 15);
    return {
      question: `Find the value of sin^2 ${angle}° + cos^2 ${angle}°.`,
      answer: "1",
      solution: "This is a standard trigonometric identity: sin^2 θ + cos^2 θ = 1 for every angle θ.",
      difficulty: "easy",
    };
  }

  if (templateIndex === 2) {
    const target = 8 + (index % 5);
    return {
      question: `If the arithmetic mean of ${a}, ${b}, x, and ${c} is ${target}, find x.`,
      answer: `${target * 4 - a - b - c}`,
      solution: `The mean of these four numbers is ${target}, so their sum is ${target * 4}. Therefore x = ${target * 4} - (${a} + ${b} + ${c}) = ${target * 4 - a - b - c}.`,
      difficulty: "easy",
    };
  }

  if (templateIndex === 3) {
    return {
      question: `A train covers ${speedDistance} km in ${speedTime} hours. What is its average speed?`,
      answer: `${(speedDistance / speedTime).toFixed(2)} km/h`,
      solution: `Speed = distance/time = ${speedDistance}/${speedTime} = ${(speedDistance / speedTime).toFixed(2)} km/h.`,
      difficulty: "easy",
    };
  }

  if (templateIndex === 4) {
    const original = percentBase;
    const increased = Math.round(original * 1.2);
    return {
      question: `A number is increased by 20% and becomes ${increased}. What was the original number?`,
      answer: `${original}`,
      solution: `If the original number is x, then x × 1.2 = ${increased}. So x = ${increased} ÷ 1.2 = ${original}.`,
      difficulty: "medium",
    };
  }

  if (templateIndex === 5) {
    const coeff = 1 + (index % 5);
    const constant = 5 + ((index * 2) % 10);
    return {
      question: `Solve for x: ${coeff}x + ${constant} = ${coeff * 3 + constant}.`,
      answer: `x = 3`,
      solution: `Subtract ${constant} from both sides and divide by ${coeff}: x = (${coeff * 3 + constant} - ${constant}) / ${coeff} = 3.`,
      difficulty: "easy",
    };
  }

  if (templateIndex === 6) {
    return {
      question: `If ${ratioA} men can finish a job in ${ratioB} days, how many days will ${ratioA * 2} men take working at the same rate?`,
      answer: `${Math.round((ratioA * ratioB) / (ratioA * 2))} days`,
      solution: `Work is inversely proportional to men. If ${ratioA} men take ${ratioB} days, then ${ratioA * 2} men take ${ratioA * ratioB} / ${ratioA * 2} = ${Math.round((ratioA * ratioB) / (ratioA * 2))} days.`,
      difficulty: "medium",
    };
  }

  if (templateIndex === 7) {
    return {
      question: `Find the area of a rectangle with sides ${areaBase} cm and ${areaBase + 2} cm.`,
      answer: `${areaBase * (areaBase + 2)} cm^2`,
      solution: `Area = length × width = ${areaBase} × ${areaBase + 2} = ${areaBase * (areaBase + 2)} cm^2.`,
      difficulty: "easy",
    };
  }

  if (templateIndex === 8) {
    return {
      question: `What is the probability of drawing a red ball from a bag containing ${a} red and ${b} blue balls?`,
      answer: `${a}/${a + b}`,
      solution: `Probability = number of favorable outcomes ÷ total outcomes = ${a} / (${a} + ${b}) = ${a}/${a + b}.`,
      difficulty: "easy",
    };
  }

  return {
    question: `The sum of two numbers is ${a + b} and their difference is ${b - a}. Find the numbers.`,
    answer: `The numbers are ${b} and ${a}.`,
    solution: `Let the numbers be x and y with x + y = ${a + b} and y - x = ${b - a}. Solve to get x = ${a} and y = ${b}.`,
    difficulty: "medium",
  };
};

const generatePhysicsFallback = (index: number): GeneratedQuestion => {
  const templateIndex = index % 10;
  const a = 2 + (index % 6);
  const t = 2 + (index % 5);
  const f = 5 + ((index * 2) % 16);
  const g = 9 + (index % 3);
  const r = 5 + ((index + 1) % 10);
  const v = 6 + ((index * 3) % 19);
  const h = 20 + ((index % 5) * 10);
  const m = 2 + ((index % 5) * 2);
  const area = 2 + (index % 6);
  const volume = 3 + ((index + 2) % 5);
  const work = 10 + ((index % 7) * 5);

  if (templateIndex === 0) {
    return {
      question: `A body starts from rest and accelerates uniformly at ${a} m/s^2 for ${t} s. What distance does it cover?`,
      answer: `${(0.5 * a * t * t).toFixed(2)} m`,
      solution: `Use s = ut + 1/2 at^2 with u = 0. So s = 1/2 × ${a} × ${t}^2 = ${(0.5 * a * t * t).toFixed(2)} m.`,
      difficulty: "medium",
    };
  }

  if (templateIndex === 1) {
    return {
      question: `A ${r} Ω resistor is connected across a ${v} V source. Calculate the current through the resistor.`,
      answer: `${(v / r).toFixed(2)} A`,
      solution: `By Ohm's law, I = V/R = ${v}/${r} = ${(v / r).toFixed(2)} A.`,
      difficulty: "easy",
    };
  }

  if (templateIndex === 2) {
    return {
      question: `A convex lens has focal length ${f} cm. What is its power in dioptres?`,
      answer: `+${(100 / f).toFixed(2)} D`,
      solution: `Power P = 1/f (in metres). Here f = ${f} cm = ${ (f / 100).toFixed(2) } m, so P = 1/${ (f / 100).toFixed(2) } = +${ (100 / f).toFixed(2) } D.`,
      difficulty: "medium",
    };
  }

  if (templateIndex === 3) {
    return {
      question: `A stone is dropped from a height of ${h} m. Taking g = ${g} m/s^2, find the time taken to reach the ground.`,
      answer: `${Math.sqrt((2 * h) / g).toFixed(2)} s`,
      solution: `Using h = 1/2 g t^2, solve t^2 = 2h/g = ${ (2 * h) / g }. Then t = √${ (2 * h) / g } = ${ Math.sqrt((2 * h) / g).toFixed(2) } s.`,
      difficulty: "medium",
    };
  }

  if (templateIndex === 4) {
    return {
      question: `A force of ${work} N moves an object through ${t} m. Calculate the work done.`,
      answer: `${work * t} J`,
      solution: `Work = force × distance = ${work} × ${t} = ${work * t} J.`,
      difficulty: "easy",
    };
  }

  if (templateIndex === 5) {
    return {
      question: `A mass of ${m} kg is accelerated at ${a} m/s^2. What is the required force?`,
      answer: `${(m * a).toFixed(2)} N`,
      solution: `Use F = ma, so F = ${m} × ${a} = ${(m * a).toFixed(2)} N.`,
      difficulty: "easy",
    };
  }

  if (templateIndex === 6) {
    return {
      question: `A liquid of density ${area} g/cm^3 occupies a volume of ${volume} cm^3. Find its mass.`,
      answer: `${area * volume} g`,
      solution: `Mass = density × volume = ${area} × ${volume} = ${area * volume} g.`,
      difficulty: "easy",
    };
  }

  if (templateIndex === 7) {
    const powerTime = 2 + ((index + 1) % 5);
    return {
      question: `A machine does ${work * 2} J of work in ${powerTime} s. What is its power?`,
      answer: `${((work * 2) / powerTime).toFixed(2)} W`,
      solution: `Power = work/time = ${work * 2}/${powerTime} = ${((work * 2) / powerTime).toFixed(2)} W.`,
      difficulty: "medium",
    };
  }

  if (templateIndex === 8) {
    const pressureArea = 4 + (index % 5);
    const forceValue = 50 + ((index % 6) * 10);
    return {
      question: `A force of ${forceValue} N acts over an area of ${pressureArea} cm^2. Calculate the pressure in N/m^2 (Pa).`,
      answer: `${((forceValue / pressureArea) * 10000).toFixed(0)} Pa`,
      solution: `Convert area to m^2: ${pressureArea} cm^2 = ${pressureArea / 10000} m^2. Pressure = force/area = ${forceValue} / ${ (pressureArea / 10000).toFixed(4) } = ${((forceValue / pressureArea) * 10000).toFixed(0)} Pa.`,
      difficulty: "medium",
    };
  }

  return {
    question: `A ball of mass ${m} kg is thrown with velocity ${a * 2} m/s. What is its kinetic energy?`,
    answer: `${(0.5 * m * Math.pow(a * 2, 2)).toFixed(2)} J`,
    solution: `Kinetic energy = 1/2 mv^2 = 1/2 × ${m} × (${a * 2})^2 = ${(0.5 * m * Math.pow(a * 2, 2)).toFixed(2)} J.`,
    difficulty: "medium",
  };
};

const generateGeneralFallback = (index: number, request: QuestionRequest): GeneratedQuestion => {
  const topicPrompt = request.topic || request.subject || "the topic";
  const variants = [
    `Explain ${topicPrompt} with a concise exam-style answer and one example.`,
    `Describe the key points of ${topicPrompt} clearly and professionally.`,
    `Write an exam-style response on ${topicPrompt} including definitions and one application.`,
    `Summarize the concept of ${topicPrompt} in formal language and mention its importance.`,
    `Give a structured answer about ${topicPrompt} using a definition, two details, and one example.`,
  ];
  const question = variants[index % variants.length];
  return {
    question,
    answer: `A clear and professional response giving a definition, important points, and one practical example for ${topicPrompt}.`,
    solution: `Begin with a definition of ${topicPrompt}, follow with two or three important points or steps, and end with a short example or application.`,
    difficulty: "medium",
  };
};

const localQuestionTemplates = (request: QuestionRequest): GeneratedQuestion[] => {
  const subject = normalizeSubject(request.subject);
  const topic = request.topic || (subject === "general" ? request.subject : subject);
  const year = request.year;
  const exam = request.exam;

  const banks: Record<string, GeneratedQuestion[]> = {
    physics: [],
    mathematics: [],
    chemistry: [],
    biology: [],
    reasoning: [],
    history: [],
    geography: [],
    economics: [],
    "computer science": [],
    commerce: [],
    "general-awareness": [],
    english: [],
    aptitude: [],
    general: [],
  };

  const subjectGenerator: Record<string, (index: number, request: QuestionRequest) => GeneratedQuestion> = {
    physics: (index) => generatePhysicsFallback(index),
    mathematics: (index) => generateMathFallback(index),
    chemistry: (index) => ({
      question: `Balance the chemical equation and identify the product for question ${index + 1}.`,
      answer: `Balance by adjusting coefficients so that each element is equal on both sides.`,
      solution: `Count atoms of each element on both sides, adjust coefficients, and confirm the total is equal.`,
      difficulty: "medium",
    }),
    biology: (index) => ({
      question: `Explain the main function of a biological structure in ${request.subject} for question ${index + 1}.`,
      answer: `It performs a key role such as energy production, storage, or transport.`,
      solution: `Describe the structure, its function in the organism, and one example of its role.`, 
      difficulty: "easy",
    }),
    reasoning: (index) => ({
      question: `Solve this reasoning problem number ${index + 1} and explain your logic.`,
      answer: `Apply the pattern or rule step by step to find the correct result.`,
      solution: `Identify the sequence or logic rule, show each step, and give the final answer with explanation.`,
      difficulty: index % 3 === 0 ? "hard" : "medium",
    }),
    english: (index) => ({
      question: `Complete the sentence or choose the correct word in this English question ${index + 1}.`,
      answer: `Select the option that best fits grammar and meaning.`,
      solution: `Explain the grammar rule or word meaning, then justify the chosen answer.`,
      difficulty: "medium",
    }),
    "general-awareness": (index) => ({
      question: `Answer this general awareness question number ${index + 1}.`,
      answer: `Use factual general knowledge to answer clearly and concisely.`,
      solution: `State the correct fact, add one supporting detail, and connect it to the broader topic.`, 
      difficulty: "easy",
    }),
    aptitude: (index) => ({
      question: `Solve this aptitude question number ${index + 1} using calculation or reasoning.`,
      answer: `Compute the result with clear steps.`,
      solution: `Show the logic and calculation in order, then give the final numeric answer.`, 
      difficulty: "medium",
    }),
    general: (idx, req) => generateGeneralFallback(idx, req),
  };

  const selected = banks[subject] ?? banks.general;
  const generator = subjectGenerator[subject] ?? subjectGenerator.general;

  const output: GeneratedQuestion[] = [];
  const used = new Set<string>();
  let index = 0;

  while (output.length < request.count && index < request.count * 4) {
    const candidate = generator(index, request);
    const questionText = candidate.question.trim();
    if (!used.has(questionText)) {
      used.add(questionText);
      output.push({
        ...candidate,
        year,
        exam,
        topic: request.topic,
        difficulty: candidate.difficulty ?? "medium",
        question: `${request.mode === "pyq" ? "(Past paper style) " : ""}${questionText}`,
      });
    }
    index++;
  }

  if (output.length < request.count) {
    let fallbackIndex = 0;
    while (output.length < request.count) {
      const base = selected[fallbackIndex % selected.length] ?? { question: `Question ${fallbackIndex + 1}.`, answer: "Answer.", solution: "Solution.", difficulty: "medium" };
      const questionVariant = `${base.question} (variant ${Math.floor(fallbackIndex / Math.max(1, selected.length)) + 1})`;
      if (!used.has(questionVariant)) {
        used.add(questionVariant);
        output.push({
          ...base,
          question: `${request.mode === "pyq" ? "(Past paper style) " : ""}${questionVariant}`,
          year,
          exam,
          topic: request.topic,
          difficulty: base.difficulty ?? "medium",
        });
      }
      fallbackIndex++;
    }
  }

  return output.slice(0, request.count);
};

const tidyPrompt = (text: string) => text.trim().replace(/\s+/g, " ");

const extractTopic = (text: string) =>
  tidyPrompt(text)
    .replace(/^(what is|what are|who is|who are|explain|define|describe|tell me about|how to|how do i|write about)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();

const localGeneralReply = (latestQuestion: string) => {
  const prompt = tidyPrompt(latestQuestion);
  const lower = prompt.toLowerCase();
  const topic = extractTopic(prompt) || "this topic";

  if (/^(hi|hello|hey|hii|namaste)\b/i.test(prompt)) {
    return [
      "Hi! Ask me anything: a concept, a coding problem, a timetable, a PYQ topic, or a writing task.",
      "",
      "For example: `explain photosynthesis`, `write a Python factorial program`, or `make a 7-day study plan for physics`.",
    ].join("\n");
  }

  if (/(javascript|typescript|html|css|java|c\+\+|cpp|c program|react).*(code|script|program)|(?:code|script|program).*(javascript|typescript|html|css|java|c\+\+|cpp|react)/i.test(prompt)) {
    if (/javascript|js/i.test(prompt)) {
      return [
        "Here is a simple JavaScript example:",
        "",
        "```javascript",
        "const numbers = [1, 2, 3, 4, 5];",
        "const sum = numbers.reduce((total, value) => total + value, 0);",
        "",
        "console.log(`Sum: ${sum}`);",
        "```",
        "",
        "You can tell me the exact task and I will shape the code for it.",
      ].join("\n");
    }

    if (/html|css/i.test(prompt)) {
      return [
        "Here is a small HTML/CSS starter:",
        "",
        "```html",
        "<!doctype html>",
        "<html>",
        "<head>",
        "  <style>",
        "    body { font-family: Arial, sans-serif; padding: 24px; }",
        "    .box { border: 1px solid #ddd; padding: 16px; border-radius: 8px; }",
        "  </style>",
        "</head>",
        "<body>",
        "  <div class=\"box\">Hello, world!</div>",
        "</body>",
        "</html>",
        "```",
      ].join("\n");
    }

    return [
      "I can write that code. Here is a basic structure:",
      "",
      "```text",
      "1. Read the input",
      "2. Process the data",
      "3. Print or return the result",
      "```",
      "",
      "Send the language and exact task, and I will give the complete program.",
    ].join("\n");
  }

  if (/^(what is|what are|define)\b/i.test(prompt)) {
    return [
      `**${topic}** means the main idea, object, or process being asked about.`,
      "",
      "**Simple explanation:**",
      `${topic} can be understood by looking at its definition, purpose, and one example.`,
      "",
      "**Answer format you can use:**",
      `- Definition: ${topic} is the concept being discussed.`,
      "- Key point: mention its main function or importance.",
      "- Example: add one real or textbook example.",
      "",
      `If you want, ask: \`explain ${topic} with example\`, and I will expand it.`,
    ].join("\n");
  }

  if (/^(explain|describe|tell me about)\b/i.test(prompt)) {
    return [
      `**${topic}**`,
      "",
      "Here is a clear explanation:",
      "",
      `- **Meaning:** ${topic} is the central concept in this question.`,
      "- **Main idea:** understand what it does, why it matters, and where it is used.",
      "- **Example:** connect it to a simple real-life or exam-style situation.",
      "- **Exam tip:** write the definition first, then add 2-3 key points and an example.",
      "",
      "A good short answer structure is: definition -> key points -> example -> conclusion.",
    ].join("\n");
  }

  if (/^(how to|how do i|how can i)\b/i.test(prompt)) {
    return [
      `Here is a practical way to handle **${topic}**:`,
      "",
      "1. Identify the exact goal.",
      "2. Break it into small steps.",
      "3. Do the first simple version.",
      "4. Check the result and fix mistakes.",
      "5. Improve it with examples or practice.",
      "",
      "If this is for coding, send the language. If it is for study, send the subject and exam.",
    ].join("\n");
  }

  if (/write|essay|paragraph|letter|application|email|summary|notes/i.test(lower)) {
    return [
      `Here is a clean draft for **${topic}**:`,
      "",
      `${topic} is an important subject because it helps us understand the main idea clearly. To write a good answer, start with a short introduction, explain two or three key points, and end with a simple conclusion.`,
      "",
      "**Structure:**",
      "- Introduction: introduce the topic.",
      "- Body: explain the main points with examples.",
      "- Conclusion: summarize the idea in one or two lines.",
    ].join("\n");
  }

  if (/plan|timetable|schedule|study routine|revision/i.test(lower)) {
    return [
      "Here is a simple study plan:",
      "",
      "| Time | Activity |",
      "| --- | --- |",
      "| 25 min | Study one concept |",
      "| 5 min | Short break |",
      "| 25 min | Solve questions |",
      "| 10 min | Review mistakes |",
      "",
      "**Tip:** Use this cycle 2-4 times per day and revise weak topics first.",
    ].join("\n");
  }

  if (/solve|calculate|find|equation|sum|average|percentage/i.test(lower)) {
    return [
      "I can solve it step by step.",
      "",
      "For a math or numericals question, send the full expression or values. Example:",
      "",
      "```text",
      "Solve: x^2 - 5x + 6 = 0",
      "```",
      "",
      "Then I will show the formula, substitution, steps, and final answer.",
    ].join("\n");
  }

  return [
    `**Answer: ${prompt}**`,
    "",
    "Here is a useful way to understand it:",
    "",
    `- First, identify the main topic: **${topic}**.`,
    "- Then write the core meaning in one simple sentence.",
    "- Add 2-3 important points.",
    "- Finish with an example or use case.",
    "",
    "If you ask with a little more detail, I can give a more exact answer with examples, code, or step-by-step solution.",
  ].join("\n");
};


const demoAssistantReply = (messages: ChatMessage[]) => {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content.trim());
  const latestQuestion = userMessages[userMessages.length - 1] ?? "your request";
  const q = latestQuestion.toLowerCase();

  if (/(python|phython|pyhton).*(script|program|code)|(?:script|program|code).*(python|phython|pyhton)/i.test(latestQuestion)) {
    if (/headline|scrape|scraping|news/i.test(latestQuestion)) {
      return [
        "Here is a simple Python script to scrape headlines from a webpage:",
        "",
        "```python",
        "import requests",
        "from bs4 import BeautifulSoup",
        "",
        "url = \"https://example.com\"  # replace with the news page URL",
        "",
        "headers = {",
        "    \"User-Agent\": \"Mozilla/5.0\"",
        "}",
        "",
        "response = requests.get(url, headers=headers, timeout=10)",
        "response.raise_for_status()",
        "",
        "soup = BeautifulSoup(response.text, \"html.parser\")",
        "",
        "headlines = []",
        "for tag in soup.find_all([\"h1\", \"h2\", \"h3\"]):",
        "    text = tag.get_text(strip=True)",
        "    if text:",
        "        headlines.append(text)",
        "",
        "for index, headline in enumerate(headlines[:20], start=1):",
        "    print(f\"{index}. {headline}\")",
        "```",
        "",
        "Install the needed packages:",
        "",
        "```bash",
        "pip install requests beautifulsoup4",
        "```",
      ].join("\n");
    }

    if (/natural|first.*natural|natural.*no|natural.*number/i.test(latestQuestion)) {
      return [
        "Here is a Python script to print the first `n` natural numbers:",
        "",
        "```python",
        "n = int(input(\"Enter how many natural numbers to print: \"))",
        "",
        "for number in range(1, n + 1):",
        "    print(number)",
        "```",
        "",
        "Example:",
        "",
        "```text",
        "Enter how many natural numbers to print: 5",
        "1",
        "2",
        "3",
        "4",
        "5",
        "```",
      ].join("\n");
    }

    return [
      "Here is a basic Python script:",
      "",
      "```python",
      "name = input(\"Enter your name: \")",
      "print(f\"Hello, {name}!\")",
      "```",
      "",
      "Tell me what the script should do, and I can make it more specific.",
    ].join("\n");
  }

  if (/first.*natural|natural.*no|natural.*number/i.test(q)) {
    return [
      "The first natural number is **1**.",
      "",
      "Natural numbers are counting numbers:",
      "",
      "```text",
      "1, 2, 3, 4, 5, ...",
      "```",
      "",
      "Python example:",
      "",
      "```python",
      "print(1)",
      "```",
    ].join("\n");
  }

  if (/question|pyq|sample|previous year|exam|practice/i.test(latestQuestion)) {
    return [
      "- Focus on the topic by breaking it into the exact concepts the exam usually tests.",
      "- Practice 3-5 representative questions in the exam style.",
      "- Review each worked solution step by step and write down the mistake pattern.",
      "- Revise the same topic again after one day and one week.",
    ].join("\n");
  }

  return localGeneralReply(latestQuestion);
};

async function callAI(messages: ChatMessage[], options?: { model?: string }) {
  const apiKey = process.env.LOVABLE_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  if (!apiKey) {
    return demoAssistantReply(messages);
  }
  const selectedModel = normalizeChatModel(options?.model);
  const provider = process.env.LOVABLE_API_KEY
    ? "lovable"
    : process.env.OPENAI_API_KEY
    ? "openai"
    : "generic";
  const url =
    provider === "openai"
      ? OPENAI_URL
      : provider === "lovable"
      ? LOVABLE_GATEWAY_URL
      : process.env.AI_API_URL ?? OPENAI_URL;
  const model =
    selectedModel ??
    (provider === "openai"
      ? "gpt-5"
      : provider === "lovable"
      ? process.env.LOVABLE_MODEL ?? "gemini-3-flash-preview"
      : process.env.AI_MODEL ?? "gemini-3-flash-preview");

  const body = JSON.stringify({
    model,
    temperature: 0.0,
    max_tokens: 3000,
    messages,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace.");
    const t = await res.text();
    console.error("AI gateway error", res.status, t);
    throw new Error("AI service unavailable");
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

/** Chat with study assistant */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages: ChatMessage[] }) =>
    z
      .object({
        messages: z
          .array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string().min(1).max(4000),
            }),
          )
          .min(1)
          .max(30),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const reply = await callAI([
      {
        role: "system",
        content:
          "You are StudySync AI — a fast, knowledgeable general assistant in the style of ChatGPT / Gemini. Answer ANY question across any subject (math, science, programming, history, languages, current affairs, career, life skills, etc.) with accurate, clear, well-structured markdown. Use headings, lists, code blocks, and examples when useful. Be concise by default but go deep when the question warrants it. Always use the full prior conversation as context, and when the user references earlier questions, recall and refer back to them.",
      },
      ...data.messages,
    ]);
    return { reply };
  });

/** Ask 2-3 clarifying questions before generating a timetable */
export const getTimetableQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subjects: string[]; hoursPerDay: number; goal?: string }) =>
    z
      .object({
        subjects: z.array(z.string().min(1).max(60)).min(1).max(12),
        hoursPerDay: z.number().min(1).max(16),
        goal: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const reply = await callAI([
      {
        role: "system",
        content:
          'You are a study planner. Given the student\'s subjects, hours/day, and goal, ask 2-3 short clarifying questions that will make the timetable more personal (e.g. exam dates, weakest topics, preferred study time, breaks). Respond ONLY with a JSON array of strings, no prose. Example: ["When is your exam?", "Which subject feels hardest?"].',
      },
      {
        role: "user",
        content: `Subjects: ${data.subjects.join(", ")}\nHours/day: ${data.hoursPerDay}\nGoal: ${data.goal ?? "(not provided)"}`,
      },
    ]);
    let questions: string[] = [];
    try {
      const match = reply.match(/\[[\s\S]*\]/);
      questions = match ? JSON.parse(match[0]) : [];
    } catch {
      questions = [];
    }
    return { questions: questions.slice(0, 3) };
  });

/** Generate a personalized study timetable */
export const generateTimetable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subjects: string[]; hoursPerDay: number; goal?: string; answers?: { q: string; a: string }[] }) =>
    z
      .object({
        subjects: z.array(z.string().min(1).max(60)).min(1).max(12),
        hoursPerDay: z.number().min(1).max(16),
        goal: z.string().max(500).optional(),
        answers: z.array(z.object({ q: z.string().max(300), a: z.string().max(500) })).max(5).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const answersBlock = data.answers && data.answers.length
      ? `\n\nAdditional context from the student:\n${data.answers.map((x) => `- ${x.q} → ${x.a}`).join("\n")}`
      : "";
    const prompt = `Create a 7-day personalized study timetable.
Subjects: ${data.subjects.join(", ")}
Available study hours per day: ${data.hoursPerDay}
${data.goal ? `Goal: ${data.goal}` : ""}${answersBlock}

Output a clean markdown table with columns: Day | Time Block | Subject | Activity. Include 25/5 pomodoro hints and one motivational tip at the end.`;
    const reply = await callAI([
      { role: "system", content: "You are an expert academic planner. Always reply in clean markdown." },
      { role: "user", content: prompt },
    ]);
    return { plan: reply };
  });

/** Get AI insights about weak subjects */
export const getInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stats: { subject: string; minutes: number; completedTasks: number; pendingTasks: number }[] }) =>
    z
      .object({
        stats: z
          .array(
            z.object({
              subject: z.string().max(60),
              minutes: z.number().min(0),
              completedTasks: z.number().min(0),
              pendingTasks: z.number().min(0),
            }),
          )
          .max(20),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.stats.length === 0) {
      return { insights: "Start tracking study sessions and tasks to get personalized insights!" };
    }
    const prompt = `Analyze this student's study data and give 3-4 short bullet insights:
- Which subjects need more attention
- One motivational tip
- One productivity suggestion

Data:
${data.stats.map((s) => `- ${s.subject}: ${s.minutes} min studied, ${s.completedTasks} tasks done, ${s.pendingTasks} pending`).join("\n")}

Reply in markdown, under 150 words.`;
    const reply = await callAI([
      { role: "system", content: "You are a supportive academic coach." },
      { role: "user", content: prompt },
    ]);
    return { insights: reply };
  });

/** Generate previous-year or sample questions as structured JSON */
export const generateQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      mode: "pyq" | "sample";
      exam: string;
      classLevel?: string;
      subject: string;
      topic?: string;
      year?: string;
      syllabus?: string;
      count?: number;
      model?: string;
    }) =>
      z
        .object({
          mode: z.enum(["pyq", "sample"]),
          exam: z.string().min(1).max(100),
          classLevel: z.string().max(60).optional(),
          subject: z.string().min(1).max(100),
          topic: z.string().max(200).optional(),
          year: z.string().max(40).optional(),
          syllabus: z.string().max(200).optional(),
          count: z.number().int().min(1).max(100).optional(),
          model: z.enum(CHAT_MODELS).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const count = data.count ?? 5;
    const modeLabel =
      data.mode === "pyq"
        ? `actual previous-year paper questions${data.year ? ` from ${data.year}` : ""}`
        : `high-quality sample / practice questions in the style of the exam`;

    const sys = `You are a ChatGPT/Gemini-style exam question generator. Use your expert exam-writing and problem-solving capability to produce accurate questions, answers, and worked solutions in a helpful, professional, and student-friendly tone.
Schema:
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."]?,"answer":"...","solution":"step by step reasoning...","difficulty":"easy|medium|hard","year":"2023"?,"exam":"...","topic":"..."}]}
Rules:
- For PYQ mode, generate questions in the exact style of a previous-year exam paper, not generic practice questions.
- If a year is provided, emulate that year's paper format, question style, section structure, and difficulty as closely as possible.
- If the exact paper is not available, produce representative questions that still match the exam's real past-paper format and phrasing.
- Make each question unique within the set and avoid repeating the same question text when the user requests new questions multiple times.
- Follow the subject style closely. Adapt to the requested subject and exam level: school, board, university, engineering, medical, UPSC, banking, or professional certification.
- For English, use grammar, vocabulary, passage analysis, writing, and literature-style questions.
- For Physics, use conceptual reasoning, derivations, numerical problems, and physics language.
- For Chemistry, use reactions, formulas, calculations, and application-based problems.
- For Mathematics, use algebra, geometry, calculus, arithmetic, and proof-style questions.
- For History, use dates, events, source-based reasoning, and short/long answer prompts.
- For Geography, use map skills, physical processes, data interpretation, and case-based questions.
- For Commerce, economics, business, or finance, use accounting, case problems, current affairs, and calculation-based questions.
- For UPSC, banking, or reasoning exams, include analytical reasoning, data interpretation, current affairs, and aptitude-style items.
- Label each question with a clear difficulty like "easy", "medium", or "hard".
- The answer field should be direct, accurate, and conceptually deep; do not give an incomplete one-line answer when a fuller explanation is appropriate.
- The solution MUST be step-by-step reasoning that expands the answer, explains the method, and ends with the final answer.
- Use clean plain text (write x^2, sqrt(x), etc.). No LaTeX, no markdown.
- Include "options" only if MCQ; otherwise omit.
- If you cannot produce valid JSON, output exactly {"questions": []}.
- Output ONLY the JSON object.`;

    const usr = `Generate ${count} ${modeLabel}.
Exam: ${data.exam}
${data.classLevel ? `Class / Level: ${data.classLevel}` : ""}
Subject: ${data.subject}
${data.topic ? `Topic: ${data.topic}` : ""}
${data.syllabus ? `Syllabus / scope: ${data.syllabus}` : ""}
Style guidance: Produce questions appropriate for the exam and subject requested. For school or board exams, use board-style formats and wording. For university, postgraduate, UPSC, banking, aptitude, or professional exams, match the relevant exam structure, marks, and difficulty.
Ensure questions are unique, student-friendly, and suitable for competitive or academic preparation.
Include a difficulty label for each item, and make each answer direct yet conceptually deep.
Provide solutions that are clear, step-by-step, professional, and sufficiently detailed for students.
Cover varied difficulty. Each item MUST include a worked solution.`;

    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
    if (!apiKey) {
      const questions = localQuestionTemplates({
        mode: data.mode,
        exam: data.exam,
        subject: data.subject,
        topic: data.topic,
        year: data.year,
        count,
      });
      return { questions: questions.slice(0, count), meta: { mode: data.mode, exam: data.exam, year: data.year, subject: data.subject, classLevel: data.classLevel, topic: data.topic } };
    }

    const reply = await callAI([
      { role: "system", content: sys },
      { role: "user", content: usr },
    ], { model: data.model });
    let parsed: { questions?: GeneratedQuestion[] } = {};

    const cleanJson = (text: string) => {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1) return "";
      return text.slice(start, end + 1).replace(/,\s*([\]}])/g, "$1");
    };

    try {
      parsed = JSON.parse(reply);
    } catch {
      const jsonText = cleanJson(reply);
      try {
        parsed = jsonText ? JSON.parse(jsonText) : {};
      } catch {
        parsed = {};
      }
    }
    const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, count) : [];
    return {
      questions,
      meta: {
        mode: data.mode,
        exam: data.exam,
        year: data.year,
        subject: data.subject,
        classLevel: data.classLevel,
        topic: data.topic,
      },
    };
  });

/** Save selected questions to the user's question bank */
export const saveQuestionsToBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      mode: "pyq" | "sample";
      exam: string;
      year?: string;
      classLevel?: string;
      subject: string;
      questions: GeneratedQuestion[];
    }) =>
      z
        .object({
          mode: z.enum(["pyq", "sample"]),
          exam: z.string().max(100),
          year: z.string().max(40).optional(),
          classLevel: z.string().max(60).optional(),
          subject: z.string().max(100),
          questions: z
            .array(
              z.object({
                question: z.string().min(1).max(4000),
                options: z.array(z.string().max(500)).max(8).optional(),
                answer: z.string().max(1000).optional(),
                solution: z.string().max(6000).optional(),
                year: z.string().max(40).optional(),
                exam: z.string().max(100).optional(),
                topic: z.string().max(200).optional(),
              }),
            )
            .min(1)
            .max(20),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = data.questions.map((q) => ({
      user_id: context.userId,
      exam: q.exam || data.exam,
      year: q.year || data.year || null,
      class_level: data.classLevel || null,
      subject: data.subject,
      topic: q.topic || null,
      question: q.question,
      options: q.options ?? null,
      answer: q.answer || null,
      solution: q.solution || null,
      is_pyq: data.mode === "pyq",
    }));
    const { error, data: inserted } = await context.supabase
      .from("question_bank")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    return { saved: inserted?.length ?? 0 };
  });
