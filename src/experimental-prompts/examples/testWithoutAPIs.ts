/**
 * Test the poster generation system without API keys
 *
 * This demonstrates:
 * 1. Using example data
 * 2. Testing the layout engine
 * 3. Testing the prompt builder
 * 4. Validating the complete pipeline (without actual image generation)
 */

import { LayoutEngine } from '../services/layoutEngine';
import { FiboStructuredPromptBuilder } from '../services/fiboPromptBuilder';
import {
  transformerPaperBeginner,
  transformerPaperIntermediate,
  transformerPaperAdvanced,
  getRandomExample,
  getExamplesByLevel
} from '../data/exampleSummaries';

/**
 * Test 1: Layout Engine
 * The layout engine works completely offline - no API needed
 */
export function testLayoutEngine() {
  console.log('🎨 Testing Layout Engine...\n');

  const engine = new LayoutEngine();

  // Test different knowledge levels
  const beginnerLayout = engine.calculateLayout(
    transformerPaperBeginner.summary.key_concepts.length,
    'beginner',
    transformerPaperBeginner.tags
  );

  console.log('Beginner Layout:', {
    type: beginnerLayout.type,
    sections: beginnerLayout.sections.length,
    elements: beginnerLayout.sections.map(s => s.elements.length)
  });

  const advancedLayout = engine.calculateLayout(
    transformerPaperAdvanced.summary.key_concepts.length,
    'advanced',
    transformerPaperAdvanced.tags
  );

  console.log('\nAdvanced Layout:', {
    type: advancedLayout.type,
    sections: advancedLayout.sections.length,
    elements: advancedLayout.sections.map(s => s.elements.length)
  });

  return { beginnerLayout, advancedLayout };
}

/**
 * Test 2: Prompt Builder
 * The prompt builder works completely offline - generates FIBO prompts
 */
export function testPromptBuilder() {
  console.log('\n📝 Testing Prompt Builder...\n');

  const engine = new LayoutEngine();
  const builder = new FiboStructuredPromptBuilder();

  // Generate layout
  const layout = engine.calculateLayout(
    transformerPaperBeginner.summary.key_concepts.length,
    transformerPaperBeginner.knowledge_level,
    transformerPaperBeginner.tags
  );

  // Build FIBO prompt
  const prompt = builder.build(transformerPaperBeginner, layout);

  console.log('Generated FIBO Prompt Structure:');
  console.log('- Main objects:', prompt.main_object.length);
  console.log('- Text renders:', prompt.text_render.length);
  console.log('- Aspect ratio:', prompt.aspect_ratio);
  console.log('- Artistic style:', prompt.aesthetics?.artistic_style);
  console.log('- Color scheme:', prompt.aesthetics?.color_scheme?.join(', '));

  // Show text content
  console.log('\nText Content Preview:');
  prompt.text_render.slice(0, 3).forEach((text, i) => {
    console.log(`  ${i + 1}. "${text.text}" (size: ${text.font_size})`);
  });

  return prompt;
}

/**
 * Test 3: Compare All Knowledge Levels
 */
export function compareKnowledgeLevels() {
  console.log('\n📊 Comparing Knowledge Levels...\n');

  const engine = new LayoutEngine();
  const builder = new FiboStructuredPromptBuilder();

  const examples = [
    transformerPaperBeginner,
    transformerPaperIntermediate,
    transformerPaperAdvanced
  ];

  examples.forEach(example => {
    const layout = engine.calculateLayout(
      example.summary.key_concepts.length,
      example.knowledge_level,
      example.tags
    );

    const prompt = builder.build(example, layout);

    console.log(`${example.knowledge_level.toUpperCase()}:`);
    console.log(`  Layout: ${layout.type}`);
    console.log(`  Concepts: ${example.summary.key_concepts.length}`);
    console.log(`  Colors: ${prompt.aesthetics?.color_scheme?.join(', ')}`);
    console.log(`  Style: ${prompt.aesthetics?.artistic_style}`);
    console.log('');
  });
}

/**
 * Test 4: Validate Example Data Structure
 */
export function validateExampleData() {
  console.log('\n✅ Validating Example Data...\n');

  const allExamples = [
    transformerPaperBeginner,
    transformerPaperIntermediate,
    transformerPaperAdvanced,
    ...getExamplesByLevel('beginner')
  ];

  allExamples.forEach((example, i) => {
    const hasTitle = !!example.summary.title;
    const hasOneLiner = !!example.summary.one_liner;
    const hasConcepts = example.summary.key_concepts.length > 0;
    const hasMetaphors = example.summary.key_concepts.every(c => c.visual_metaphor);

    console.log(`Example ${i + 1} (${example.knowledge_level}):`);
    console.log(`  ✓ Title: ${hasTitle}`);
    console.log(`  ✓ One-liner: ${hasOneLiner}`);
    console.log(`  ✓ Concepts: ${hasConcepts} (${example.summary.key_concepts.length})`);
    console.log(`  ✓ Visual metaphors: ${hasMetaphors}`);
    console.log('');
  });
}

/**
 * Main test runner
 */
export function runAllTests() {
  console.log('🚀 Running Offline Tests (No API Keys Required)\n');
  console.log('='.repeat(60) + '\n');

  try {
    testLayoutEngine();
    testPromptBuilder();
    compareKnowledgeLevels();
    validateExampleData();

    console.log('='.repeat(60));
    console.log('\n✅ All tests completed successfully!\n');
    console.log('💡 These tests demonstrate the complete pipeline without API calls.');
    console.log('   When you add FIBO_API_KEY and FAL_KEY, the actual image');
    console.log('   generation will work using these same prompts.\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Uncomment to run tests:
// runAllTests();
