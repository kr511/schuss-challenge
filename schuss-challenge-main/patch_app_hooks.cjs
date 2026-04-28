const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Hook dashboard refresh into restartGame()
code = code.replace(
  "showScreen('screenSetup');\r\n    }",
  "showScreen('screenSetup');\r\n      // Dashboard mit frischen Daten aktualisieren\r\n      if(typeof refreshPremiumDashboard === 'function') setTimeout(refreshPremiumDashboard, 200);\r\n    }"
);

// 2. Hook into showScreen when switching to Setup
code = code.replace(
  "if (id === 'screenSetup') {\r\n        RookiePlan.evaluateAndRender(true);\r\n      } else if (id === 'screenBattle')",
  "if (id === 'screenSetup') {\r\n        RookiePlan.evaluateAndRender(true);\r\n        if(typeof refreshPremiumDashboard === 'function') refreshPremiumDashboard();\r\n        if(typeof updatePDGreeting === 'function') updatePDGreeting();\r\n      } else if (id === 'screenBattle')"
);

// 3. Hook into INIT block
code = code.replace(
  "updateSchuetzenpass();",
  "updateSchuetzenpass();\r\n    // Premium Dashboard beim Laden mit echten Daten füllen\r\n    if(typeof refreshPremiumDashboard === 'function') setTimeout(refreshPremiumDashboard, 500);"
);

fs.writeFileSync('app.js', code);
console.log('app.js hooks patched!');
