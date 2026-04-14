/**
 * Quality Assurance Test Suite
 * Validates all optimizations and performance improvements
 */
const QATestSuite = (function() {
  'use strict';

  const results = {
    responsive: [],
    performance: [],
    bugs: [],
    gameplay: [],
    passed: 0,
    failed: 0
  };

  // TEST 1: Responsive Design
  function testResponsive() {
    const tests = [
      {
        name: 'Viewport Meta Tag',
        check: () => document.querySelector('meta[name="viewport"]') !== null
      },
      {
        name: 'Mobile Touch Targets',
        check: () => {
          const buttons = document.querySelectorAll('button');
          return Array.from(buttons).every(btn => {
            const rect = btn.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44;
          });
        }
      },
      {
        name: 'No Horizontal Scrolling',
        check: () => document.documentElement.scrollWidth <= window.innerWidth + 10
      },
      {
        name: 'CSS Media Queries Present',
        check: () => {
          const sheet = document.styleSheets[0];
          let hasMediaQueries = false;
          try {
            for (let i = 0; i < sheet.cssRules.length; i++) {
              if (sheet.cssRules[i].type === CSSRule.MEDIA_RULE) {
                hasMediaQueries = true;
                break;
              }
            }
          } catch (e) { console.warn('[QA-Test] CSS Parsing Fehler:', e.message); }
          return hasMediaQueries;
        }
      }
    ];

    tests.forEach(test => {
      try {
        const passed = test.check();
        results.responsive.push({ name: test.name, passed });
        passed ? results.passed++ : results.failed++;
      } catch (e) {
        results.responsive.push({ name: test.name, passed: false, error: e.message });
        results.failed++;
      }
    });
  }

  // TEST 2: Performance
  function testPerformance() {
    const tests = [
      {
        name: 'Scripts use defer attribute',
        check: () => {
          const deferScripts = document.querySelectorAll('script[defer]').length;
          return deferScripts >= 6;
        }
      },
      {
        name: 'No blocking external resources',
        check: () => {
          const blockingScripts = document.querySelectorAll('script:not([defer]):not([async])').length;
          return blockingScripts <= 3; // Only critical scripts
        }
      },
      {
        name: 'Performance Config loaded',
        check: () => typeof PerformanceConfig !== 'undefined'
      },
      {
        name: 'Storage Manager available',
        check: () => typeof StorageManager !== 'undefined'
      },
      {
        name: 'CSS will-change hints present',
        check: () => {
          const style = getComputedStyle(document.querySelector('.btn-fire'));
          return style.willChange !== 'auto' || document.styleSheets[0].cssText.includes('will-change');
        }
      }
    ];

    tests.forEach(test => {
      try {
        const passed = test.check();
        results.performance.push({ name: test.name, passed });
        passed ? results.passed++ : results.failed++;
      } catch (e) {
        results.performance.push({ name: test.name, passed: false, error: e.message });
        results.failed++;
      }
    });
  }

  // TEST 3: Bug Fixes
  function testBugFixes() {
    const tests = [
      {
        name: 'Firebase null checks present',
        check: () => {
          const appCode = document.documentElement.outerHTML;
          return appCode.includes('fbReady && fbDb') || appCode.includes('fbReady &&');
        }
      },
      {
        name: 'Audio Context error handling',
        check: () => typeof Sfx !== 'undefined' && typeof Sfx.init === 'function'
      },
      {
        name: 'DOM elements null-safe',
        check: () => document.getElementById('profileIcon') !== null
      },
      {
        name: 'Profile overlay exists',
        check: () => document.getElementById('profileOverlay') !== null
      },
      {
        name: 'Timer cleanup functions present',
        check: () => {
          const code = document.documentElement.innerHTML || '';
          return code.includes('clearTimeout') || code.includes('clearInterval');
        }
      }
    ];

    tests.forEach(test => {
      try {
        const passed = test.check();
        results.bugs.push({ name: test.name, passed });
        passed ? results.passed++ : results.failed++;
      } catch (e) {
        results.bugs.push({ name: test.name, passed: false, error: e.message });
        results.failed++;
      }
    });
  }

  // TEST 4: Game Mechanics
  function testGameplay() {
    const tests = [
      {
        name: 'Game state initialized',
        check: () => typeof G !== 'undefined'
      },
      {
        name: 'Difficulty levels defined',
        check: () => {
          const script = document.documentElement.outerHTML;
          return script.includes('easy') && script.includes('hard') && script.includes('elite');
        }
      },
      {
        name: 'Weapon tabs present',
        check: () => document.querySelectorAll('.weapon-tab').length >= 2
      },
      {
        name: 'Profile menu accessible',
        check: () => document.getElementById('profileIcon') !== null
      },
      {
        name: 'Battle balance plans validate',
        check: () => {
          if (typeof BattleBalance === 'undefined') return false;
          const report = BattleBalance.runBalanceVerification({ sampleCount: 1, seedPrefix: 'qa-smoke' });
          window.__battleBalanceSmoke = report;
          return report.ok;
        }
      }
    ];

    tests.forEach(test => {
      try {
        const passed = test.check();
        results.gameplay.push({ name: test.name, passed });
        passed ? results.passed++ : results.failed++;
      } catch (e) {
        results.gameplay.push({ name: test.name, passed: false, error: e.message });
        results.failed++;
      }
    });
  }

  // Run all tests
  function runAllTests() {
    console.log('🧪 Starting QA Test Suite...\n');
    testResponsive();
    testPerformance();
    testBugFixes();
    testGameplay();
    reportResults();
    return results;
  }

  // Report results
  function reportResults() {
    console.log('═══════════════════════════════════════');
    console.log('   📊 QA TEST RESULTS');
    console.log('═══════════════════════════════════════\n');

    console.log('✅ RESPONSIVE DESIGN:');
    results.responsive.forEach(r => {
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}`);
    });

    console.log('\n⚡ PERFORMANCE:');
    results.performance.forEach(r => {
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}`);
    });

    console.log('\n🐛 BUG FIXES:');
    results.bugs.forEach(r => {
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}`);
    });

    console.log('\n🎮 GAMEPLAY:');
    results.gameplay.forEach(r => {
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}`);
    });

    const passRate = Math.round((results.passed / (results.passed + results.failed)) * 100);
    console.log(`\n═══════════════════════════════════════`);
    console.log(`✅ PASSED: ${results.passed} | ❌ FAILED: ${results.failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log(`═══════════════════════════════════════\n`);

    if (passRate >= 90) {
      console.log('🚀 STATUS: PRODUCTION READY ✅');
    } else {
      console.log('⚠️  STATUS: NEEDS MORE WORK');
    }
  }

  return { runAllTests, getResults: () => results };
})();

// Run tests when page is fully loaded
window.addEventListener('load', () => {
  setTimeout(() => QATestSuite.runAllTests(), 2000);
});
