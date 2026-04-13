#!/usr/bin/env node

/**
 * Email Feedback System - Test Script
 * 
 * Usage:
 *   npm run test:feedback           # Interactive test
 *   node test-feedback.js --help    # Show help
 */

const http = require('http');

const TEST_CASES = {
  valid_bug: {
    email: 'user@example.com',
    feedbackType: 'bug',
    title: 'App crashes on photo upload',
    message:
      'When I try to upload a photo on mobile (iPhone 12), the app freezes and then crashes. This happens with JPEG files larger than 2MB.',
  },
  valid_feature: {
    email: 'dev@example.com',
    feedbackType: 'feature_request',
    title: 'Add leaderboard multiplayer mode',
    message:
      'It would be amazing to have a competitive mode where users can challenge each other in real-time. The leaderboard could show weekly rankings.',
  },
  valid_general: {
    email: 'feedback@example.com',
    feedbackType: 'general',
    title: 'Great app, love it!',
    message:
      'Just wanted to say this app is really helpful for improving my shooting accuracy. The AI scoring is spot on. Keep up the great work!',
  },
  invalid_email: {
    email: 'not-an-email',
    feedbackType: 'bug',
    title: 'Invalid email test',
    message: 'This should fail validation due to invalid email format.',
  },
  invalid_title_short: {
    email: 'user@example.com',
    feedbackType: 'bug',
    title: 'X',
    message: 'Title is too short - should be minimum 3 characters.',
  },
  invalid_message_short: {
    email: 'user@example.com',
    feedbackType: 'bug',
    title: 'Valid title here',
    message: 'Too short',
  },
};

async function testFeedbackSubmission(testData, baseUrl = 'http://localhost:8787') {
  console.log('\n📝 Testing Feedback Submission\n');
  console.log('📤 Sending:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const data = await response.json();

    console.log(`\n📥 Response (${response.status}):`);
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS\n');
      return { success: true, feedbackId: data.feedbackId, statusCode: response.status };
    } else {
      console.log('\n❌ FAILED\n');
      return { success: false, statusCode: response.status, error: data };
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🧪 Email Feedback System - Full Test Suite\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  // Valid cases
  console.log('\n✅ VALID TEST CASES (should succeed)\n');

  for (const [name, testData] of Object.entries(TEST_CASES).filter(([k]) =>
    k.startsWith('valid')
  )) {
    console.log(`\n📋 Test: ${name}`);
    console.log('-'.repeat(40));
    const result = await testFeedbackSubmission(testData);
    if (result.success) {
      passed++;
      console.log(`FeedbackID: ${result.feedbackId}`);
    } else {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limit
  }

  // Invalid cases
  console.log('\n\n❌ INVALID TEST CASES (should fail)\n');

  for (const [name, testData] of Object.entries(TEST_CASES).filter(([k]) =>
    k.startsWith('invalid')
  )) {
    console.log(`\n📋 Test: ${name}`);
    console.log('-'.repeat(40));
    const result = await testFeedbackSubmission(testData);
    if (!result.success) {
      passed++;
      console.log('✅ Correctly rejected');
    } else {
      failed++;
      console.log('❌ Should have failed but succeeded');
    }
    await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limit
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed\n');
    process.exit(1);
  }
}

async function interactiveTest() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

  console.log('\n📧 Interactive Feedback Test\n');

  const email = await question('📧 Email: ');
  console.log('\nFeedback Type:');
  console.log('  1) bug');
  console.log('  2) feature_request');
  console.log('  3) general');
  const typeChoice = await question('\nChoose (1-3): ');
  const typeMap: { [k: string]: string } = {
    '1': 'bug',
    '2': 'feature_request',
    '3': 'general',
  };
  const feedbackType = typeMap[typeChoice] || 'general';

  const title = await question('\n📝 Title: ');
  const message = await question('\n💬 Message: ');

  rl.close();

  const testData = { email, feedbackType, title, message };
  await testFeedbackSubmission(testData);
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📧 Email Feedback System - Test Script

Usage:
  node test-feedback.js [command]

Commands:
  (none)         Run all tests (default)
  --all          Run full test suite
  --interactive  Interactive test mode
  --help, -h     Show this help message

Examples:
  node test-feedback.js
  node test-feedback.js --interactive
  node test-feedback.js --all

Environment:
  Set BASE_URL env var to change API endpoint (default: http://localhost:8787)
  
  Example:
    BASE_URL=https://example.com node test-feedback.js
  `);
} else if (args.includes('--interactive')) {
  interactiveTest().catch(console.error);
} else {
  runAllTests().catch(console.error);
}
