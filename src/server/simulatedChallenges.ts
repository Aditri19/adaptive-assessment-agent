export interface ProgrammedChallenge {
  title: string;
  description: string;
  context: string;
  keywords: string[];
}

export function getGoalForTopicAndDiff(topic: string, diff: number): string {
  const topicLower = topic.toLowerCase();
  if (topicLower.includes("python")) {
    switch (diff) {
      case 1: return "Master basic variables, loop syntax, lists, and simple print statements step-by-step.";
      case 2: return "Gain comfort with function definitions, positional and default parameters, and code organization rules.";
      case 3: return "Grasp Object Oriented Programming paradigms, constructors, instances, and self binding in simple classes.";
      case 4: return "Write expressive and readable list comprehensions to map, clean, and filter values concisely.";
      case 5: return "Master advanced Python patterns: custom exception classes, exception raising, and clean try-except flow control.";
      default: return "Master advanced Python patterns.";
    }
  } else if (topicLower.includes("javascript") || topicLower.includes("js")) {
    switch (diff) {
      case 1: return "Fix basic quote mismatch rules, simple string formatting, and alert/console logs.";
      case 2: return "Review let vs const reassignability rules, block scoped variables, and script execution contexts.";
      case 3: return "Understand modern ES6 array transformers like map, filter, and basic callback arrow execution blocks.";
      case 4: return "Explore asynchronous code, promise construction, timeouts, and simple resolve states.";
      case 5: return "Master JS closure patterns, private encapsulated state, and clean high-order function structures.";
      default: return "Master JS closure patterns.";
    }
  } else if (topicLower.includes("java")) {
    switch (diff) {
      case 1: return "Build console programs, main method syntax, and simple println outputs.";
      case 2: return "Differentiate primitive types double and int, variable layout, and type safety constraints.";
      case 3: return "Access and query array elements, length variables, and loop iteration limits.";
      case 4: return "Design inherits structures, subclasses extending parental base blueprints.";
      case 5: return "Implement try-catch blocks protecting against arithmetic errors and custom exception handlers.";
      default: return "Implement try-catch blocks and custom exception handlers.";
    }
  } else if (topicLower.includes("machine learning") || topicLower.includes("ai") || topicLower.includes("intelligence")) {
    switch (diff) {
      case 1: return "Define baseline terms: understanding models, training procedures, and patterns.";
      case 2: return "Distinguish prediction tasks by reviewing Supervised vs Unsupervised learning workflows.";
      case 3: return "Analyze general performance: why independent test splitting is key to avoiding overfitting.";
      case 4: return "Calculate numeric performance metrics: Mean Squared Error calculations.";
      case 5: return "Review neural networks regularization: Dropout, early stopping parameters, and weight decay.";
      default: return "Review neural networks regularization.";
    }
  } else {
    switch (diff) {
      case 1: return `Build essential terminology, baseline definitions, and core rules for ${topic}.`;
      case 2: return `Understand basic usage commands, initial steps, and setup verification routines for ${topic}.`;
      case 3: return `Structure modular code folders and maintain reusable components inside ${topic}.`;
      case 4: return `Diagnose configuration errors, look up trace log reports, and troubleshoot standard issues in ${topic}.`;
      case 5: return `Identify and mitigate deep architectural bottlenecks, high workload scaling limits, and latency spikes in ${topic}.`;
      default: return `Master deep architectural concepts of ${topic}.`;
    }
  }
}

export const PY_CHALLENGES: Record<number, ProgrammedChallenge[]> = {
  1: [
    {
      title: "Fill-in-the-Blank: Python Loops",
      description: "[LEARNING GOAL: Master basic variables, loop syntax, lists, and simple print statements.]\n\nFill in the blank (indicated by ____) to iterate over numbers from 0 to 4:\n\n`____ i in range(5):\n    print(i)`\n\nExplain what keyword goes there and why.",
      context: "# Python beginner challenge - Level 1\n# Fill in the blank:\n____ i in range(5):\n    print(i)",
      keywords: ["for"]
    },
    {
      title: "Python Arithmetic operator: Floor Division",
      description: "[LEARNING GOAL: Differentiate decimal from floor integer division operations.]\n\nGiven standard variables `a = 15` and `b = 4`, write the correct Python operator for floor division (producing 3 without decimals).",
      context: "# Python Level 1\na = 15\nb = 4\n# Calculate division here:",
      keywords: ["//"]
    },
    {
      title: "Python String Concatenation Mechanics",
      description: "[LEARNING GOAL: Join words and construct complete messages.]\n\nCombine the variable words `part1 = 'Learn'` and `part2 = 'Python'` with a single space in between to result in 'Learn Python'.",
      context: "# Python Level 1\npart1 = 'Learn'\npart2 = 'Python'\n# Combine below:",
      keywords: ["+", "part1", "part2"]
    },
    {
      title: "Modifying Lists: Adding Items",
      description: "[LEARNING GOAL: Edit array structures dynamically.]\n\nWrite a line of Python code to add string 'Blue' to the end of list `colors = ['Red', 'Green']`.",
      context: "# Python Level 1\ncolors = ['Red', 'Green']\n# Add 'Blue' below:",
      keywords: ["append", "colors", "blue"]
    },
    {
      title: "Python Comparative Statements",
      description: "[LEARNING GOAL: Evaluate parameters and redirect execution logs.]\n\nComplete the conditional check line to see if string variable `role` is exactly equal to 'Admin'.",
      context: "# Python Level 1\nrole = 'User'\n# Complete conditional header below:\n____ role == 'Admin':\n    print('Access granted')",
      keywords: ["if"]
    }
  ],
  2: [
    {
      title: "Debugging Python Function Parameters",
      description: "[LEARNING GOAL: Gain comfort with function parameter layout rules.]\n\nFix function syntax because Python raises a SyntaxError if a default parameter is written before a non-default parameter:\n\n`def greet_user(greeting=\"Hello\", username):\n    return f\"{greeting}, {username}!\"`",
      context: "# Python Level 2\ndef greet_user(greeting=\"Hello\", username):\n    return f\"{greeting}, {username}!\"",
      keywords: ["username", "greeting", "def greet_user"]
    },
    {
      title: "Python Dictionary Keys Testing",
      description: "[LEARNING GOAL: Query key elements in associative maps.]\n\nCheck if key 'email' is in dictionary `user = {'username': 'coder'}` using Python's `in` keyword.",
      context: "# Python Level 2\nuser = {'username': 'coder'}\n# Check key:",
      keywords: ["in", "user", "email"]
    },
    {
      title: "Python Slicing: Retrieving Segments",
      description: "[LEARNING GOAL: Retrieve slices from string characters.]\n\nSlice the first 3 letters from string `word = 'Learning'`. State the slice index expression.",
      context: "# Python Level 2\nword = 'Learning'\n# Extract slice of first 3 letters below:",
      keywords: ["word", "[0:3]", "[:3]"]
    },
    {
      title: "Global Variable scope modifier",
      description: "[LEARNING GOAL: Update parent module scope records.]\n\nExplain how to successfully increment global integer `clicks` from inside a local function `click()` without raising an error.",
      context: "# Python Level 2\nclicks = 0\ndef click():\n    # Modify global clicks below:\n    clicks += 1",
      keywords: ["global"]
    },
    {
      title: "Tuple Unpacking Mechanics",
      description: "[LEARNING GOAL: Destructure data variables.]\n\nUnpack tuple `coords = (38.89, -77.03)` into separate variables named `lat` and `lng` inside a single line.",
      context: "# Python Level 2\ncoords = (38.89, -77.03)\n# Unpack below:",
      keywords: ["lat", "lng", "coords"]
    }
  ],
  3: [
    {
      title: "Python Class Initialization",
      description: "[LEARNING GOAL: Grasp OOP paradigms, instance initializations, and class structures.]\n\nImplement a simple Python class called `Learner` that is initialized with string parameter `name`. It should contain method `get_greeting(self)` returning `f\"Hello, {self.name}\"`. Make sure constructor receives `name` and binds to `self.name`.",
      context: "# Python beginner challenge - Level 3\nclass Learner:\n    # Write constructor with 'name' property and get_greeting method\n    pass",
      keywords: ["__init__", "self", "get_greeting", "name"]
    },
    {
      title: "File Context Managers: Read Operations",
      description: "[LEARNING GOAL: Safely stream information files and close locks automatically.]\n\nUse Python's `with` structure to open file 'notes.txt' in read mode ('r') and bind file content to variable `data`.",
      context: "# Python Level 3\n# Open notes.txt safely using with statement below:",
      keywords: ["with open", "notes.txt", "as", "read"]
    },
    {
      title: "Advanced List Sorting keys",
      description: "[LEARNING GOAL: Apply custom key metrics during list sorting operations.]\n\nSort list of strings `names = ['alexander', 'bo', 'chris']` by their lengths using Python's `sorted()` or `.sort()` with custom lambda function.",
      context: "# Python Level 3\nnames = ['alexander', 'bo', 'chris']",
      keywords: ["len", "lambda", "sort", "key"]
    },
    {
      title: "Calculated Intersections in Python Sets",
      description: "[LEARNING GOAL: Extract overlaps of distinct element datasets.]\n\nGiven Python sets `science_club = {'Ana', 'Roy'}` and `math_club = {'Roy', 'Dan'}`, find their intersection using set operators.",
      context: "# Python Level 3\nscience_club = {'Ana', 'Roy'}\nmath_club = {'Roy', 'Dan'}\n# Identify common club members:",
      keywords: ["intersection", "&"]
    },
    {
      title: "Double Filters inside List Comprehensions",
      description: "[LEARNING GOAL: Apply nested numeric filters inside comprehension lists.]\n\nWrite a list comprehension that extracts only positive even values from `raw = [-4, -3, 2, 5, 8, 11]`.",
      context: "# Python Level 3\nraw = [-4, -3, 2, 5, 8, 11]\n# Filter positive even values below:",
      keywords: ["> 0", "% 2 == 0", "raw", "for"]
    }
  ],
  4: [
    {
      title: "Python List Comprehensions & Filter Transitions",
      description: "[LEARNING GOAL: Write expressive, clean Python list comprehensions to filter values.]\n\nGiven a list of scores `[45, 82, 91, 55, 30, 99]`, write a single-line Python list comprehension that filters scores strictly greater than 50. Name filtered list variable `passing_scores`.",
      context: "# Python beginner challenge - Level 4\nscores = [45, 82, 91, 55, 30, 99]\n# Create passing_scores comprehension below:\n",
      keywords: ["for", "scores", "> 50", "passing_scores"]
    },
    {
      title: "Generator yield functions",
      description: "[LEARNING GOAL: Implement lazy generator execution flows.]\n\nWrite a simple generator function `countdown(n)` that yields integers from `n` down to 1 utilizing standard `yield` keyword.",
      context: "# Python Level 4\ndef countdown(n):\n    # Yield numbers sequentially below:\n    pass",
      keywords: ["yield", "while", "countdown"]
    },
    {
      title: "Nonlocal Closures Nested State",
      description: "[LEARNING GOAL: Modify state variables in nested enclosing parent scopes.]\n\nWrite an accumulator function `make_accumulator()` where inner function `add(value)` updates parent level `total` using standard `nonlocal` keyword.",
      context: "# Python Level 4\ndef make_accumulator():\n    total = 0\n    def add(value):\n        # Complete using nonlocal keyword\n        pass\n    return add",
      keywords: ["nonlocal", "total", "add"]
    },
    {
      title: "Multiple Inheritance resolution lookup",
      description: "[LEARNING GOAL: Deconstruct python inheritance resolutions.]\n\nDefine how Python resolves method lookups in multiple inheritance hierarchies (mention what MRO stands for and name the algorithm).",
      context: "# Python Level 4\n# Record brief explanation:",
      keywords: ["mro", "method resolution order", "c3"]
    },
    {
      title: "Lambda Filtering Lists",
      description: "[LEARNING GOAL: Express inline filtering loops.]\n\nUse standard `filter()` and `lambda` function to filter words starting with letter 'P' from list `languages = ['Python', 'Java', 'PHP']`.",
      context: "# Python Level 4\nlanguages = ['Python', 'Java', 'PHP']\n# Filter with lambda here:",
      keywords: ["filter", "lambda", "startswith", "p"]
    }
  ],
  5: [
    {
      title: "Python Custom Metaclasses for Architectural Validation",
      description: "[GURU OUTCOME: Enforce annotations checks at runtime class declarations.]\n\nImplement custom Python Metaclass named `EnforceAnnotationsMeta` that intercepts class creation and raises a `TypeError` if any custom method defined inside declared class lacks type annotations for arguments or returns.",
      context: "# Python Master Challenge - Level 5\nclass EnforceAnnotationsMeta(type):\n    # Intercept __new__ and inspect type annotations:\n    def __new__(mcs, name, bases, attrs):\n        # Validate annotations and raise TypeError if missing:\n        return super().__new__(mcs, name, bases, attrs)",
      keywords: ["__new__", "typeerror", "annotations", "super"]
    },
    {
      title: "Asynchronous Workloads Pool Rate Limiting",
      description: "[GURU OUTCOME: Safeguard rate constraints utilizing Semaphore classes.]\n\nWrite asynchronous task executor `async def run_highly_concurrent(tasks)` that executes list of async functions concurrently using `asyncio.gather`, but strictly enforces a limit of 3 concurrent active tasks using `asyncio.Semaphore`.",
      context: "# Python Master Challenge - Level 5\nimport asyncio\nasync def run_highly_concurrent(tasks):\n    # Implement rate limit using Semaphore below:\n    pass",
      keywords: ["semaphore", "gather", "asyncio", "with"]
    },
    {
      title: "Double Decorators Preserving Namespace Signatures",
      description: "[GURU OUTCOME: Write safe custom decorator modules preserving execution metadata.]\n\nCreate Python double decorator `@log_and_retry(retries=3)` that logs function call parameters, catches subclasses of Exception, and automatically retries function call up to 3 times, using `functools.wraps` to safely preserve original names.",
      context: "# Python Master Challenge - Level 5\nimport functools\ndef log_and_retry(retries=3):\n    # Create a double nested decorator wrapper:\n    pass",
      keywords: ["wraps", "decorator", "retries", "try", "except"]
    },
    {
      title: "Custom Descriptors for Type Safety enforcing",
      description: "[GURU OUTCOME: Author type checks intercepting property variables.]\n\nDesign customized Python descriptor class named `IntegerDescriptor` that intercepts property assignment values on a model class and raises strict `TypeError` if user attempts to store non-integer value.",
      context: "# Python Master Challenge - Level 5\nclass IntegerDescriptor:\n    # Implement get and set descriptors below:\n    pass",
      keywords: ["__get__", "__set__", "typeerror", "instance"]
    },
    {
      title: "High-Throughput Bidirectional Data Pipelines",
      description: "[GURU OUTCOME: Create running smooth average pipelines utilizing sent generator states.]\n\nWrite Python coroutine generator `def average_coroutine()` that runs an infinite loop. On receiving new integer values via `generator.send(value)`, it should update running counts and yield exact cumulative running mean as float.",
      context: "# Python Master Challenge - Level 5\ndef average_coroutine():\n    # Implement running average utilizing yield and send below:\n    pass",
      keywords: ["yield", "send", "while", "average"]
    }
  ]
};

export const JS_CHALLENGES: Record<number, ProgrammedChallenge[]> = {
  1: [
    {
      title: "JavaScript Syntax/Quotes Debugger",
      description: "[LEARNING GOAL: Fix basic string quote mismatch rules and console logs.]\n\nCorrect the quote matching typo in this single line of JavaScript code:\n\n`const message = 'Hello\";`\n\nProvide the fixed line of code and a brief explanation.",
      context: "// JS Level 1\nconst message = 'Hello\";",
      keywords: ["hello"]
    },
    {
      title: "JS Variables reassignment properties",
      description: "[LEARNING GOAL: Differentiate let and const modifier assignments.]\n\nThe code `const score = 10; score = 20;` fails because const values cannot be reassigned. Rewrite using let to allow updating variables.",
      context: "// JS Level 1\nconst score = 10;\nscore = 20;",
      keywords: ["let score"]
    },
    {
      title: "JavaScript String Concatenation",
      description: "[LEARNING GOAL: Join text characters safely.]\n\nUse standard concatenation operators to combine `firstName = 'Coding'` and `lastName = 'Coach'` with a space in between.",
      context: "// JS Level 1\nlet firstName = 'Coding';\nlet lastName = 'Coach';\n# Concatenate:",
      keywords: ["+", "firstName", "lastName"]
    },
    {
      title: "Modulo Checks for Even Numbers",
      description: "[LEARNING GOAL: Learn basic conditional arithmetic operations.]\n\nFill in the blank with the correct modulo operator to verify if variable `n` is even: `if (n ____ 2 === 0)`",
      context: "// JS Level 1\nlet n = 8;\nif (n ____ 2 === 0)",
      keywords: ["%"]
    },
    {
      title: "JS read array size length",
      description: "[LEARNING GOAL: Query lengths of collections in JS.]\n\nWrite down property or statement used to read the number of elements in array `items = ['Apple', 'Lime']`.",
      context: "// JS Level 1\nlet items = ['Apple', 'Lime'];\n// Read size:",
      keywords: ["items.length"]
    }
  ],
  2: [
    {
      title: "JavaScript Scope & Constant Rules",
      description: "[LEARNING GOAL: Review variables scope, block structures and re-assignment behavior.]\n\nThis JS snippet raises a TypeError because it attempts to reassign a `const` variable. Fix it by using modern ES6 keyword for block-scoped reassignable variables:\n\n`const counter = 0;\ncounter = counter + 1;`\n\nProvide the full, corrected code!",
      context: "// JS Level 2\nconst counter = 0;\ncounter = counter + 1;",
      keywords: ["let counter"]
    },
    {
      title: "JS Object property deletion",
      description: "[LEARNING GOAL: Remove object properties dynamically.]\n\nWrite JS line of code to delete property `score` from object `learner = { name: 'Ava', score: 100 }` using delete keyword.",
      context: "// JS Level 2\nconst learner = { name: 'Ava', score: 100 };\n// Write delete command:",
      keywords: ["delete", "learner.score"]
    },
    {
      title: "JavaScript Arrays appending push",
      description: "[LEARNING GOAL: Store entries in collections safely.]\n\nUse correct array method to insert 'Gold' onto end of array `prizes = ['Bronze', 'Silver']`.",
      context: "// JS Level 2\nconst prizes = ['Bronze', 'Silver'];\n// Add Gold below:",
      keywords: ["push", "gold", "prizes"]
    },
    {
      title: "Truthy vs Falsy conditionals check",
      description: "[LEARNING GOAL: Evaluate truth metrics of clean configurations.]\n\nDoes blank empty array `[]` represent truthy or falsy inside standard JavaScript conditional evaluations?",
      context: "// JS Level 2\n// Answer truthy or falsy and explain why below:",
      keywords: ["truthy"]
    },
    {
      title: "Math absolute peak checks",
      description: "[LEARNING GOAL: Find maximum values using standard Math utilities.]\n\nWrite short JS expression using standard global Math object to determine larger value of variables `x = 77` and `y = 104`.",
      context: "// JS Level 2\nlet x = 77; let y = 104;\n// Select larger value:",
      keywords: ["Math.max", "x", "y"]
    }
  ],
  3: [
    {
      title: "JS Array Operations: Map",
      description: "[LEARNING GOAL: Understand arrow functions and array mapping transformations.]\n\nGiven an array of string items `['Alice', 'Bob']`, use modern `.map()` array transformer to return array of greetings. E.g., `['Hello, Alice', 'Hello, Bob']`. Write your JS mapper expression.",
      context: "// JS Level 3\nconst names = ['Alice', 'Bob'];\n// Transform names using map below:\n",
      keywords: ["map", "names", "=>", "hello"]
    },
    {
      title: "JS Arrow Functions modern syntax",
      description: "[LEARNING GOAL: Convert functions to modern block arrow syntax.]\n\nConvert classic function `function addOne(x) { return x + 1; }` into concise arrow function on a single line.",
      context: "// JS Level 3\nfunction addOne(x) { return x + 1; }",
      keywords: ["=>", "x + 1", "addOne"]
    },
    {
      title: "JavaScript Template Literals conversion",
      description: "[LEARNING GOAL: Format logs readable utilizing backticks.]\n\nRewrite `console.log(title + ' was completed for ' + score + ' points')` using modern ES6 template literal backticks.",
      context: "// JS Level 3\nlet title = 'Quiz 1'; let score = 90;",
      keywords: ["`", "${title}", "${score}"]
    },
    {
      title: "JS Object properties destructuring",
      description: "[LEARNING GOAL: Deconstruct nested parameters on single lines.]\n\nUnpack keys `username` and `status` from variable `record = { username: 'scholar', status: 'online', code: 5 }` inside single line.",
      context: "// JS Level 3\nconst record = { username: 'scholar', status: 'online', code: 5 };",
      keywords: ["const {", "username", "status", "}", "record"]
    },
    {
      title: "Filtering collections with ES6",
      description: "[LEARNING GOAL: Eliminate outdated items in arrays.]\n\nExtract only scores greater than 70 from list `allScores = [50, 85, 90, 65]` using modern array `.filter()` loops.",
      context: "// JS Level 3\nconst allScores = [50, 85, 90, 65];",
      keywords: ["filter", "allScores", "=>", "70"]
    }
  ],
  4: [
    {
      title: "JavaScript Promise Resolution",
      description: "[LEARNING GOAL: Process asynchronous promise timers using modern resolve callbacks.]\n\nComplete asynchronous function `fetchState` to resolve/return string value 'Success' after 50ms delay, using Promise constructor:\n\n`function fetchState() {\n  return new Promise((resolve) => {\n    // Resolve with 'Success' after 50ms\n  });\n}`",
      context: "// JS Level 4\nfunction fetchState() {\n  return new Promise((resolve) => {\n    // Add timeout/resolve logic\n  });\n}",
      keywords: ["promise", "resolve", "setTimeout", "success"]
    },
    {
      title: "JS async await wrappers syntax",
      description: "[LEARNING GOAL: Adapt promise flows into clean linear async procedures.]\n\nWrite async function `display()` that awaits unresolved promise `fetchRemoteData()` and returns resolved result.",
      context: "// JS Level 4\nfunction fetchRemoteData() { return Promise.resolve('Success'); }\n// Complete display function:",
      keywords: ["async function display", "await fetchRemoteData"]
    },
    {
      title: "Array aggregates with reduce",
      description: "[LEARNING GOAL: Sum and combine values of arrays.]\n\nUse array `.reduce()` function to sum all number elements inside array `weights = [10, 20, 30]`.",
      context: "// JS Level 4\nconst weights = [10, 20, 30];",
      keywords: ["reduce", "weights", "prev", "curr", "0"]
    },
    {
      title: "JS Set elements for uniqueness",
      description: "[LEARNING GOAL: Eliminate repetitive records.]\n\nCreate new unique ES6 standard `Set` object named `uniqueScores` from array `scores = [1, 1, 2, 3, 3]`.",
      context: "// JS Level 4\nconst scores = [1, 1, 2, 3, 3];",
      keywords: ["new Set", "scores"]
    },
    {
      title: "DOM Query Listener bindings",
      description: "[LEARNING GOAL: Bind interactivity to client displays.]\n\nWrite down JS query selector statement to add 'click' event listener onto button element with id `submit-btn`.",
      context: "// JS Level 4\n// Select submit-btn element and attach click listener below:",
      keywords: ["addEventListener", "click", "submit-btn"]
    }
  ],
  5: [
    {
      title: "JavaScript High-Performance Async Rate Limiting executor",
      description: "[GURU OUTCOME: Write concurrent rate limited workers with Promise collections.]\n\nWrite custom async function `executeWithLimit(promiseFactories, limit)` that executes collection of zero-argument async functions (promise factories) but limits current active concurrent resolved promises to `limit` at any given time.",
      context: "// JS Master Challenge - Level 5\nasync function executeWithLimiter(factories, limit) {\n  // Implement batch worker rates:\n  return Promise.all( /* code */ );\n}",
      keywords: ["promise", "limit", "execute", "concurrent"]
    },
    {
      title: "Secure Object Isolation against Prototype Pollution",
      description: "[GURU OUTCOME: Freeze deep object schemas against security injection hacks.]\n\nImplement robust recursive deep freeze algorithm named `secureDeepFreeze(obj)` that completely isolates, freezes, and protects nested objects from prototype pollution vulnerabilities.",
      context: "// JS Master Challenge - Level 5\nfunction secureDeepFreeze(obj) {\n  // Recursively freeze object trees\n  return obj;\n}",
      keywords: ["Object.freeze", "isFrozen", "recursive", "prototype"]
    },
    {
      title: "Proxy Based Reactive State Observers",
      description: "[GURU OUTCOME: Program dynamic reactive binding proxies.]\n\nBuild lightweight reactive state tracker function `createReactive(initialState, effect)` that uses ES6 `Proxy` to automatically run `effect(property, newValue)` whenever state variables are written or changed.",
      context: "// JS Master Challenge - Level 5\nfunction createReactive(initialState, effect) {\n  // Use new Proxy handler traps:\n  return new Proxy(initialState, {});\n}",
      keywords: ["Proxy", "set", "Reflect.set", "effect", "target"]
    },
    {
      title: "Cross-Origin Thread Communication Shared Array Atomics",
      description: "[GURU OUTCOME: Orchestrate parallel processes using thread arrays.]\n\nWrite atomic synchronization block used in JavaScript Web Workers to synchronize shared memory buffers utilizing `Atomics.wait` and `Atomics.notify` in `Int32Array` objects.",
      context: "// JS Master Challenge - Level 5\n// Write SharedArrayBuffer atomics synchronization commands:\n",
      keywords: ["SharedArrayBuffer", "Atomics.wait", "Atomics.notify", "Int32Array"]
    },
    {
      title: "Closure leakage mitigation garbage sweeps",
      description: "[GURU OUTCOME: Safely dispose references inside closure callback structures.]\n\nDemonstrate how retaining reference trap in closure structure triggers memory leakages. Write down clean memory release commands to free referenced variable instances after execution.",
      context: "// JS Master Challenge - Level 5\n// Explain and isolate retaining state leaks below:\n",
      keywords: ["null", "nullify", "retention", "garbage collection"]
    }
  ]
};

export const JAVA_CHALLENGES: Record<number, ProgrammedChallenge[]> = {
  1: [
    {
      title: "Java Main Print Statement Syntax",
      description: "[LEARNING GOAL: Identify and write main console printing methods.]\n\nComplete Java print statement to output text \"Learn Java\":\n\n`System.out.____(\"Learn Java\");`\n\nWrite correct method code wrapper.",
      context: "// Java Level 1\nSystem.out.____(\"Learn Java\");",
      keywords: ["println"]
    },
    {
      title: "Java Variable Declaration syntax",
      description: "[LEARNING GOAL: Declare variables with correct static type assignments.]\n\nFill in blank to declare integer variable named `score` storing 99, and double variable named `average` storing 8.5.",
      context: "// Java Level 1\n____ score = 99;\n____ average = 8.5;",
      keywords: ["int score", "double average"]
    },
    {
      title: "Java String value Comparison check",
      description: "[LEARNING GOAL: Compare String contents correctly on JVM.]\n\nGiven two String variables `str1` and `str2`, write down why using `==` is an anti-pattern, and show correct Java API method to assess value equality.",
      context: "// Java Level 1\nString str1 = new String(\"hello\");\nString str2 = new String(\"hello\");",
      keywords: ["equals", "str1", "str2"]
    },
    {
      title: "Java Array index value reading",
      description: "[LEARNING GOAL: Read individual array elements.]\n\nWrite Java code to read and assign negative value located at index 2 of integer array `int[] numbers = {10, -5, -15, 20}`.",
      context: "// Java Level 1\nint[] numbers = {10, -5, -15, 20};\n// Read negative value below:",
      keywords: ["numbers[2]"]
    },
    {
      title: "Java standard main signature blank",
      description: "[LEARNING GOAL: Write main execution entry points.]\n\nComplete missing return type block inside standard Java application entries: `public static ____ main(String[] args)`",
      context: "// Java Level 1\npublic static ____ main(String[] args)",
      keywords: ["void"]
    }
  ],
  2: [
    {
      title: "Java Variables: Primitive Type Selection",
      description: "[LEARNING GOAL: Choose double vs int storage representations for decimal/integer digits.]\n\nFill in blank with appropriate Java primitive data type keywords to compile successfully:\n\n`____ gradeAverage = 88.5;\n____ studentCount = 30;`",
      context: "// Java Level 2\n____ gradeAverage = 88.5;\n____ studentCount = 30;",
      keywords: ["double", "int"]
    },
    {
      title: "Java Switch Cases control routes",
      description: "[LEARNING GOAL: Match selection keys using switch options.]\n\nComplete Java switch statement evaluating integer variable `categoryCode` and outputting text for case 3: `case 3: System.out.println(\"Category 3\"); ____;`",
      context: "// Java Level 2\nint categoryCode = 3;\nswitch (categoryCode) {\n    case 3: System.out.println(\"Category 3\"); ____;\n}",
      keywords: ["break"]
    },
    {
      title: "Java Loops while execution boundaries",
      description: "[LEARNING GOAL: Run iteration blocks up to numeric targets.]\n\nComplete loop condition statements to print integers up to 5: `int counter = 1; while (counter ____ 5)`",
      context: "// Java Level 2\nint counter = 1;\nwhile(counter ____ 5) {\n    System.out.println(counter);\n    counter++;\n}",
      keywords: ["<=", "< 6"]
    },
    {
      title: "Java Constructor assignments",
      description: "[LEARNING GOAL: Bind parameters during object initializations.]\n\nDeclare simple constructor for simple Java class `User` that takes String parameter called `username` and binds to instance variable `this.username`.",
      context: "// Java Level 2\npublic class User {\n    private String username;\n    // Define constructor here:\n}",
      keywords: ["public User", "username", "this.username"]
    },
    {
      title: "Java Methods parameter signatures",
      description: "[LEARNING GOAL: Build custom calculations returning integers.]\n\nComplete method declaration headers for helper `calculate` receiving double inputs returning integer value.",
      context: "// Java Level 2\n// Complete method signature below:\n____ calculate(double value) {\n    return (int) value;\n}",
      keywords: ["int calculate"]
    }
  ],
  3: [
    {
      title: "Java Arrays & Length Queries",
      description: "[LEARNING GOAL: Extract array boundaries with index length variables.]\n\nWrite short Java statement printing number of elements in array of integers named `scores`. What property or method on arrays do we use?",
      context: "// Java Level 3\nint[] scores = {90, 85, 95};\n// How to query scores length?",
      keywords: ["scores.length"]
    },
    {
      title: "Java Dynamic collections ArrayList inserters",
      description: "[LEARNING GOAL: Add data entries onto dynamic JVM lists.]\n\nComplete Java import and line of code to insert strings onto list `namesList` dynamically utilizing Java `.add()`.",
      context: "// Java Level 3\nimport java.util.ArrayList;\nArrayList<String> namesList = new ArrayList<>();\n// Insert 'Ava' onto arraylist:",
      keywords: ["namesList.add", "ava"]
    },
    {
      title: "Java OOP Methods Overloading",
      description: "[LEARNING GOAL: Craft overloaded methods matching varied arguments.]\n\nDeclare two overloaded method signatures named `render` - one taking String, another taking integer.",
      context: "// Java Level 3\npublic class Display {\n    // Overload render parameter inputs:\n}",
      keywords: ["void render", "String", "int"]
    },
    {
      title: "Java final modifier rules",
      description: "[LEARNING GOAL: Constrain assignments using final controls.]\n\nDescribe what compiler error happens when programmer attempts to assign a new value to `final` class variable in Java.",
      context: "// Java Level 3\nfinal int APP_LIMIT = 500;",
      keywords: ["cannot be reassigned", "compile", "final"]
    },
    {
      title: "HashMap collections map key queries",
      description: "[LEARNING GOAL: Map key and values using Map classes.]\n\nWrite down JVM import and standard declaration string to instantiate String-to-Integer map using `HashMap`.",
      context: "// Java Level 3\n// Write Map HashMap instantiation below:",
      keywords: ["HashMap", "Map", "import java.util.HashMap"]
    }
  ],
  4: [
    {
      title: "Java Object Inheritance",
      description: "[LEARNING GOAL: Design subclasses extending parental base blueprints.]\n\nYou have base class `Vehicle`. You want to declare subclass `Car` that inherits from `Vehicle`. Write down missing Java inheritance keyword:\n\n`public class Car ____ Vehicle {}`",
      context: "// Java Level 4\npublic class Car ____ Vehicle {}",
      keywords: ["extends"]
    },
    {
      title: "Java Custom Interface structures",
      description: "[LEARNING GOAL: Declare static blueprint standards with interfaces.]\n\nCreate simple Java interface named `Playable` outlining single contract method `void play();`.",
      context: "// Java Level 4\ninterface Playable {\n    // Outline play contract below:\n}",
      keywords: ["void play()"]
    },
    {
      title: "HashMap entry lookups",
      description: "[LEARNING GOAL: Extract values mapped to keys on Map objects.]\n\nQuery and extract integer value mapped to key \"coder\" from HashMap `scores` using standard Hash keys methods.",
      context: "// Java Level 4\nimport java.util.HashMap;\nHashMap<String, Integer> scores = new HashMap<>();",
      keywords: ["scores.get", "coder"]
    },
    {
      title: "Java static methods constraints",
      description: "[LEARNING GOAL: Evaluate access boundaries of class levels.]\n\nExplain why static method expressions in Java cannot access class-level instance variables directly without instantiating instance variable object.",
      context: "// Java Level 4\npublic class Checker {\n    private int id = 55;\n    public static void run() {\n        // Explain access constraints\n    }\n}",
      keywords: ["instance", "static context"]
    },
    {
      title: "Java Abstract classes implementations",
      description: "[LEARNING GOAL: Inherit abstract patterns.]\n\nExtend abstract Parent class `Animal` declaring abstract double method `getAge()` inside child `Cat`.",
      context: "// Java Level 4\nabstract class Animal {\n    abstract double getAge();\n}\nclass Cat extends Animal {\n    // Implement contract:\n}",
      keywords: ["double getAge", "extends Animal"]
    }
  ],
  5: [
    {
      title: "Lock-Free Highly Concurrent Stack",
      description: "[GURU OUTCOME: Safe comparisons and loop modifications.]\n\nImplement thread-safe, lock-free stack using `AtomicReference` and compare-and-swap (CAS) loops inside class `ConcurrentStack`.",
      context: "// Java Master Challenge - Level 5\nimport java.util.concurrent.atomic.AtomicReference;\npublic class ConcurrentStack<T> {\n    private AtomicReference<Node<T>> head = new AtomicReference<>();\n    // Implement safe pushing using compareAndSet CAS loop below:\n}",
      keywords: ["compareAndSet", "atomicreference", "while", "head"]
    },
    {
      title: "JVM Garbage Collector Optimization & STW mitigation",
      description: "[GURU OUTCOME: Identify G1GC parameters to avoid Garbage latency split seconds.]\n\nAnalyze Stop-The-World (STW) heap pauses in JVM. Name two G1 GC JVM runtime flags or GC algorithms used to minimize pauses under intense heap cycles.",
      context: "// Java Master Challenge - Level 5\n// List optimization flags or GC algorithms:",
      keywords: ["-XX:+UseG1GC", "ZGC", "Shenandoah", "STW", "PauseTime"]
    },
    {
      title: "Custom JVM Bytecode ClassLoader injector",
      description: "[GURU OUTCOME: Load bytecode arrays bypassing file paths.]\n\nWrite skeleton for custom Java `ClassLoader` named `CustomWebLoader` overriding `findClass(String name)` loading dynamically bytecode arrays with `defineClass`.",
      context: "// Java Master Challenge - Level 5\npublic class CustomWebLoader extends ClassLoader {\n    @Override\n    protected Class<?> findClass(String name) throws ClassNotFoundException {\n        byte[] data = null; // load data\n        return defineClass(name, data, 0, data.length);\n    }\n}",
      keywords: ["defineClass", "findClass", "ClassLoader", "Override"]
    },
    {
      title: "Memory Leak mitigation with Identity dictionaries",
      description: "[GURU OUTCOME: Eliminate GC memory leakages with Weak collections.]\n\nDescribe how memory reference accumulation triggers GC retention memory leakages inside high-cycle cache maps. Implement safe cache map using `WeakHashMap` reference rules.",
      context: "// Java Master Challenge - Level 5\nimport java.util.WeakHashMap;\n// Use WeakHashMap cache collections below:\n",
      keywords: ["WeakHashMap", "weak", "garbage collect", "retention"]
    },
    {
      title: "High Performance Phased Synchronizer Loops",
      description: "[GURU OUTCOME: Implement parallel coordinates of dynamic concurrent phases.]\n\nWrite Java concurrency execution script synchronizing dynamic multi-phased parallel worker tasks utilizing Java's `Phaser`.",
      context: "// Java Master Challenge - Level 5\nimport java.util.concurrent.Phaser;\n// Define Phase boundaries coordinates below:\n",
      keywords: ["Phaser", "arriveAndAwaitAdvance", "register", "dynamic"]
    }
  ]
};

export const ML_CHALLENGES: Record<number, ProgrammedChallenge[]> = {
  1: [
    {
      title: "ML Definitions: Model Concept",
      description: "[LEARNING GOAL: Distinguish static logical flows from trained mathematical patterns.]\n\nChoose correct letter for this multiple choice question:\n\nWhat is 'Model' in Machine Learning?\n\nA) A mockup presenting fashion garments\nB) A mathematical function trained to recognize patterns using data\nC) A spreadsheet showing financial balances\nD) A type of code compression module\n\nType correct letter (A, B, C, or D).",
      context: "# ML Level 1\n# Choice A, B, C, or D:",
      keywords: ["b", "matrix", "function", "pattern"]
    },
    {
      title: "Isolating columns: Features vs Targets",
      description: "[LEARNING GOAL: Differentiate input parameters from prediction targets.]\n\nIn predicting vehicle's fuel efficiency given engine cylinders, weight, and speed: are engine cylinders and weight Features or Target?",
      context: "# ML Level 1\n# Features or Target?",
      keywords: ["features"]
    },
    {
      title: "Pre-calculating error: Absolute Diff",
      description: "[LEARNING GOAL: Understand simple math error absolute rates.]\n\nIf actual price is 100, and prediction is 92, calculate Absolute Error metric.",
      context: "# ML Level 1\n# Calculate Absolute Error:",
      keywords: ["8"]
    },
    {
      title: "Dataset Definitions: Training Dataset",
      description: "[LEARNING GOAL: Map functions of dataset records.]\n\nIn machine learning, what is exact term for dataset used to fit model's coefficients or weights?",
      context: "# ML Level 1\n# Name dataset category:",
      keywords: ["training", "train"]
    },
    {
      title: "Prediction Categorization: Classification vs Regression",
      description: "[LEARNING GOAL: Distinguish discrete classes from continuous predictions.]\n\nIf we predict whether transaction is 'Fraud' or 'Authorized', is this Regression or Classification?",
      context: "# ML Level 1\n# Regression or Classification?",
      keywords: ["classification"]
    }
  ],
  2: [
    {
      title: "Supervised vs Unsupervised ML",
      description: "[LEARNING GOAL: Differentiate predictive tasks based on presence or absence of labels.]\n\nAn algorithm groups house images according to visual similarities WITHOUT target house price ratings or categories. Is this task Supervised or Unsupervised Learning? Define in one word and explain why.",
      context: "# ML Level 2\n# Supervised or Unsupervised?",
      keywords: ["unsupervised"]
    },
    {
      title: "ML Training Loss values analysis",
      description: "[LEARNING GOAL: Assess optimization loops behavior.]\n\nExplain why classifier's training loss values (such as Cross-Entropy Loss) should consistently decrease across successive training epochs.",
      context: "# ML Level 2\n# Explain training loss trends:",
      keywords: ["decrease", "optimize", "gradients", "weights"]
    },
    {
      title: "Linear Regression math equations",
      description: "[LEARNING GOAL: Model simplest linear coefficients.]\n\nWrite classic mathematical equation for Simple Linear Regression with one input feature `x`, slope weight `w`, and intercept bias `b`.",
      context: "# ML Level 2\n# Equation:",
      keywords: ["y =", "wx", "b", "mx"]
    },
    {
      title: "Confusion Matrix: False Positives rules",
      description: "[LEARNING GOAL: Assess Type I error outputs of binary models.]\n\nIn model outcome reviews, state in one simple sentence what a 'False Positive' value represents.",
      context: "# ML Level 2\n# Define False Positive concept:",
      keywords: ["predicted positive", "actually negative", "type i"]
    },
    {
      title: "Continuous estimations algorithms",
      description: "[LEARNING GOAL: Map algorithms matching numeric outputs.]\n\nName baseline, simplest parametric algorithm used to estimate a continuous numeric variable.",
      context: "# ML Level 2\n# Identify algorithm name below:",
      keywords: ["linear regression"]
    }
  ],
  3: [
    {
      title: "Model Performance: Train-Test Splits",
      description: "[LEARNING GOAL: Implement data splitting principles to prevent predictive memorization/overfitting.]\n\nWhy is it critical to evaluate a Machine Learning model's performance on separate 'Test Set' never seen during training? Explain overfitting in 2 sentences.",
      context: "# ML Level 3\n# Explanation of Test Sets:",
      keywords: ["overfit", "memoriz", "generaliz", "unseen", "test"]
    },
    {
      title: "ML Normalization Scaling functions",
      description: "[LEARNING GOAL: Normalise parameters bounds securely.]\n\nWrite mathematical formula for Min-Max Scaling of input feature x mapping to [0,1].",
      context: "# ML Level 3\n# Write MinMax normalise math equation below:",
      keywords: ["min", "max", "x -", "x_min"]
    },
    {
      title: "Underfitting diagnostics indicators",
      description: "[LEARNING GOAL: Diagnose low complexity structural constraints.]\n\nIf model exhibits low accuracy on both training and testing datasets, does this signify underfitting or overfitting?",
      context: "# ML Level 3\n# Underfit or Overfit below:",
      keywords: ["underfit", "complexity", "capacity"]
    },
    {
      title: "Trees splits metrics: Gini Impurity",
      description: "[LEARNING GOAL: Select indicators partitioning decision branches.]\n\nWhich quantitative impurity metric is calculated on Decision Tree classifiers to select optimal splits?",
      context: "# ML Level 3\n# Name purity metric:",
      keywords: ["gini", "entropy", "impurity"]
    },
    {
      title: "Validation splits: K-Fold cross validation",
      description: "[LEARNING GOAL: Verify split validity loops.]\n\nWhy is performing k-fold cross-validation superior to performing single train-test split?",
      context: "# ML Level 3\n# Explain K-Fold benefits:",
      keywords: ["variance", "bias", "splits", "folds", "folds validation"]
    }
  ],
  4: [
    {
      title: "ML Regression Metrics: Mean Squared Error",
      description: "[LEARNING GOAL: Calculate simple error metrics for numeric estimations.]\n\nIf model predicts housing pricing values of `[150, 300]`, but actual targets are `[140, 320]`, calculate Mean Squared Error (MSE).",
      context: "# ML Level 4\n# Calculate MSE for Predictions: [150, 300] and Actuals: [140, 320]",
      keywords: ["250", "mean squared", "predicted", "actual", "square"]
    },
    {
      title: "Learning Rates Gradient Descent impact",
      description: "[LEARNING GOAL: Adjust step sizes inside training variables.]\n\nExplain what mathematical error convergence failure happens when training learning rate is configured too high.",
      context: "# ML Level 4\n# Identify learning rate consequences:",
      keywords: ["diverge", "oscillate", "overshoot", "too large"]
    },
    {
      title: "Precision vs Recall metrics trade-off",
      description: "[LEARNING GOAL: Evaluate binary scoring compromises.]\n\nExplain why moving decision threshold representing Spam classifiers higher to maximize Precision typically reduces Recall rate.",
      context: "# ML Level 4\n# Explain precision recall relationships:",
      keywords: ["threshold", "false negative", "precision", "recall", "trade"]
    },
    {
      title: "L1 vs L2 regularization shrinkage checks",
      description: "[LEARNING GOAL: Identify structural weight shrinkage traits.]\n\nWhich regularization norm penalty (L1 Lasso or L2 Ridge) results in feature selection by driving non-critical weights to zero?",
      context: "# ML Level 4\n# Identify L1 or L2 below:",
      keywords: ["l1", "lasso"]
    },
    {
      title: "K-Means cluster update conditions",
      description: "[LEARNING GOAL: Reposition clusters centroids based on updates.]\n\nExplain what mathematical update step is performed iteratively during K-Means clustering after calculating assignments.",
      context: "# ML Level 4\n# Calculate centroid coordinates below:",
      keywords: ["mean", "centroid", "average", "recompute", "coordinates"]
    }
  ],
  5: [
    {
      title: "Transformer Attention Weights Calculus",
      description: "[GURU OUTCOME: Write down mathematical Dot-Product scaling formulations.]\n\nState exact mathematical equation of Scaled Dot-Product Attention in modern multi-head transformer modules.",
      context: "# ML Master Challenge - Level 5\n# Write scale dot product attention equation below:\n",
      keywords: ["softmax", "q", "k^t", "sqrt", "d_k", "v"]
    },
    {
      title: "Gradients Backpropagation math calculations",
      description: "[GURU OUTCOME: Write nested weight update product derivatives.]\n\nWrite chain rule derivative formulation used during Backpropagation to compute gradient of weight parameter `w`.",
      context: "# ML Master Challenge - Level 5\n# Write nested backpropagation derivatives details below:",
      keywords: ["partial", "derivative", "chain rule", "g'", "z"]
    },
    {
      title: "Markov Operations Bellman Equation mappings",
      description: "[GURU OUTCOME: Formulate reinforcement value optimization limits.]\n\nWrite complete recursive Bellman Optimality Equation for state-value function `V*(s)`.",
      context: "# ML Master Challenge - Level 5\n# Write recursive Bellman state value equation below:\n",
      keywords: ["bellman", "max_a", "gamma", "transition", "reward"]
    },
    {
      title: "Adam Optimizer Bias Correction mechanics",
      description: "[GURU OUTCOME: Derive bias corrected momentum coordinates.]\n\nState formulas for bias-corrected moving averages of first/second moments (`m_hat`, `v_hat`) in Adam optimizer.",
      context: "# ML Master Challenge - Level 5\n# Formulate bias corrections moving averages below:\n",
      keywords: ["beta_1", "beta_2", "1 -", "moment", "bias"]
    },
    {
      title: "Gradient Penalty Lipschitz constraints in WGAN-GP",
      description: "[GURU OUTCOME: Formulate Wasserstein regularizations bounds.]\n\nDerive mathematical loss addition of 1-Lipschitz Gradient Penalty term in Wasserstein GAN discriminator.",
      context: "# ML Master Challenge - Level 5\n# Formulate WGAN-GP GP parameters below:\n",
      keywords: ["gradient penalty", "lipschitz", "l2 norm", "norm - 1", "lambda"]
    }
  ]
};
