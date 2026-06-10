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

const generateMathFallback = (index: number) => {
  const templateIndex = index % 10;
  const a = 2 + (index % 9);
  const b = 3 + ((index * 2) % 7);
  const c = 4 + ((index * 3) % 6);
  const t = 2 + (index % 5);
  const speedDistance = 20 + ((index % 8) * 5);
  const speedTime = 2 + (index % 6);
  const percentBase = 10 + ((index % 6) * 5);
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

const generatePhysicsFallback = (index: number): any => {
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
      solution: `Power P = 1/f (in metres). Here f = ${f} cm = ${(f / 100).toFixed(2)} m, so P = 1/${(f / 100).toFixed(2)} = +${(100 / f).toFixed(2)} D.`,
      difficulty: "medium",
    };
  }

  if (templateIndex === 3) {
    return {
      question: `A stone is dropped from a height of ${h} m. Taking g = ${g} m/s^2, find the time taken to reach the ground.`,
      answer: `${Math.sqrt((2 * h) / g).toFixed(2)} s`,
      solution: `Using h = 1/2 g t^2, solve t^2 = 2h/g = ${(2 * h) / g}. Then t = √${(2 * h) / g} = ${Math.sqrt((2 * h) / g).toFixed(2)} s.`,
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
      solution: `Convert area to m^2: ${pressureArea} cm^2 = ${(pressureArea / 10000).toFixed(4)} m^2. Pressure = force/area = ${forceValue} / ${(pressureArea / 10000).toFixed(4)} = ${((forceValue / pressureArea) * 10000).toFixed(0)} Pa.`,
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

const generateGeneralFallback = (index: number, request: { topic?: string; subject: string }) => {
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

const localQuestionTemplates = (request: { mode: "pyq" | "sample"; exam: string; subject: string; topic?: string; year?: string; count: number }) => {
  const subject = normalizeSubject(request.subject);
  const topic = request.topic || (subject === "general" ? request.subject : subject);
  const year = request.year;
  const exam = request.exam;

  const banks: Record<string, any[]> = {
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

  const subjectGenerator: Record<string, (index: number, request: any) => any> = {
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

  const output: any[] = [];
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
      const base = selected[fallbackIndex % selected.length] ?? {
        question: `Question ${fallbackIndex + 1}.`,
        answer: "Answer.",
        solution: "Solution.",
        difficulty: "medium",
      };
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

const subjects = [
  'physics',
  'mathematics',
  'chemistry',
  'biology',
  'reasoning',
  'history',
  'geography',
  'economics',
  'computer science',
  'commerce',
  'general-awareness',
  'english',
  'aptitude',
  'general',
  'Physics',
  'Maths',
  'Chemistry',
  'Bio',
  'English',
  'GK',
  'CS',
  'PolScience',
];

for (const subject of subjects) {
  const questions = localQuestionTemplates({ mode: 'pyq', exam: 'Test Exam', subject, count: 20, year: '2025' });
  const qset = new Set(questions.map((q) => q.question));
  const duplicates = questions.length - qset.size;
  console.log(`${subject}: count=${questions.length}, unique=${qset.size}, duplicates=${duplicates}`);
  if (duplicates > 0) {
    console.log('DUPLICATES:');
    questions.forEach((q) => console.log(q.question));
  }
}
