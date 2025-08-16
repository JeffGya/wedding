<template>
  <div class="rich-text-editor">
    <Editor
      v-model="editorContent"
      :modules="modules"
      :formats="formats"
      editorStyle="height: 400px"
      ref="editorRef"
      @text-change="handleTextChange"
    >
      <template #toolbar>
        <div class="ql-toolbar ql-snow">
          <!-- Header dropdown -->
          <select class="ql-header">
            <option selected></option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>
          
          <!-- Font size dropdown -->
          <select class="ql-size">
            <option value="small">Small</option>
            <option selected>Normal</option>
            <option value="large">Large</option>
            <option value="huge">Huge</option>
          </select>
          
          <!-- Font family dropdown -->
          <select class="ql-font">
            <option selected></option>
            <option value="serif">Serif</option>
            <option value="sans">Sans Serif</option>
            <option value="cursive">Cursive</option>
            <option value="monospace">Monospace</option>
          </select>
          
          <!-- Text formatting buttons -->
          <span class="ql-formats">
            <button class="ql-bold" title="Bold">
              <i class="i-solar:bold-bold"></i>
            </button>
            <button class="ql-italic" title="Italic">
              <i class="i-solar:italic-bold"></i>
            </button>
            <button class="ql-underline" title="Underline">
              <i class="i-solar:underline-bold"></i>
            </button>
          </span>
          
          <!-- List buttons -->
          <span class="ql-formats">
            <button class="ql-list" value="ordered" title="Numbered List">
              <i class="i-solar:list-bold"></i>
            </button>
            <button class="ql-list" value="bullet" title="Bullet List">
              <i class="i-solar:list-check-bold"></i>
            </button>
          </span>
          
          <!-- Link and image buttons -->
          <span class="ql-formats">
            <button class="ql-link" title="Insert Link">
              <i class="i-solar:link-bold"></i>
            </button>
            <button class="ql-image" title="Insert Image">
              <i class="i-solar:image-bold"></i>
            </button>
            <button
              type="button"
              class="ql-custom-image"
              @mousedown.prevent
              @click="openImagePicker"
              title="Insert Image from Library"
            >
              <i class="i-solar:gallery-bold"></i>
            </button>
          </span>
          
          <!-- Button insertion -->
          <span class="ql-formats">
            <button
              type="button"
              class="ql-custom-button"
              @mousedown.prevent
              @click="insertButton"
              title="Insert Button"
            >
              <i class="i-solar:button-bold"></i>
            </button>
          </span>
          
          <!-- HTML toggle -->
          <span class="ql-formats">
            <button type="button" @mousedown.prevent @click="toggleHtml" title="Toggle HTML">
              <i class="i-solar:code-bold"></i>
            </button>
          </span>
        </div>
      </template>
    </Editor>
    
    <ImagePicker
      :visible="pickerVisible"
      @update:visible="pickerVisible = $event"
      @select="insertImage"
    />
    
    <ButtonConfigModal
      :visible="buttonConfigVisible"
      @close="buttonConfigVisible = false"
      @insert="handleButtonConfigInsert"
    />
    
    <div v-if="showHtml" class="mt-2">
      <textarea v-model="htmlContent" rows="10" class="w-full border rounded p-2" @input="updateFromHtml"></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import Editor from 'primevue/editor';
import Quill from 'quill';
import ImagePicker from '@/components/ui/ImagePicker.vue';
import ButtonConfigModal from '@/components/ui/ButtonConfigModal.vue';

// Register custom font formats
const Font = Quill.import('formats/font');
Font.whitelist = ['serif', 'sans', 'cursive', 'monospace'];
Quill.register(Font, true);

// Remove the custom Quill format code entirely

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  context: {
    type: String,
    default: 'email', // 'email' for messages/templates, 'page' for page blocks
    validator: (value) => ['email', 'page'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue']);

// Use ref instead of computed to avoid reactivity conflicts
const editorContent = ref(props.modelValue || '');
const htmlContent = ref(props.modelValue || '');
const isInternalUpdate = ref(false);

// Proper modules configuration with toolbar enabled
const modules = {
  toolbar: {
    container: '.ql-toolbar'
  },
  clipboard: {
    matchVisual: false
  }
};

const formats = [
  'font', 
  'size', 
  'header', 
  'bold', 
  'italic', 
  'underline', 
  'list', 
  'link', 
  'image'
];

const editorRef = ref(null);
const showHtml = ref(false);
const pickerVisible = ref(false);
const buttonConfigVisible = ref(false);

// Enhanced function to convert button markers to proper HTML based on context
function convertButtonMarkersToHtml(content) {
  if (!content) return content;
  
  let processedContent = content;
  
  if (props.context === 'page') {
    // Page buttons are already HTML, no conversion needed
    return processedContent;
  } else {
    // Convert email button markers to table structure with URLs
    processedContent = processedContent.replace(
      /\[BUTTON:([^|]+)\|([^\]]+)\]/g,
      (match, buttonText, buttonUrl) => `
        <table cellpadding="0" cellspacing="0" border="0" style="margin: 20px auto;">
          <tr>
            <td style="background: #442727; border-radius: 8px; padding: 12px 24px; text-align: center;">
              <a href="${buttonUrl}" style="font-family: 'Open Sans', sans-serif; font-size: 16px; font-weight: 600; color: #DAA520; text-decoration: none; display: inline-block;">
                ${buttonText}
              </a>
            </td>
          </tr>
        </table>
      `
    );
  }
  
  return processedContent;
}

// Modify the existing handleTextChange function to process button markers
function handleTextChange(delta, oldDelta, source) {
  if (!isInternalUpdate.value) {
    isInternalUpdate.value = true;
    const newContent = editorRef.value.quill.root.innerHTML;
    
    // Convert button markers to proper HTML
    const processedContent = convertButtonMarkersToHtml(newContent);
    
    editorContent.value = processedContent;
    htmlContent.value = processedContent;
    emit('update:modelValue', processedContent);
    isInternalUpdate.value = false;
  }
}

// Enhanced button insertion that opens config modal
function insertButton() {
  buttonConfigVisible.value = true;
}

// Handle button configuration from modal
function handleButtonConfigInsert(buttonConfig) {
  if (editorRef.value && editorRef.value.quill) {
    const quill = editorRef.value.quill;
    const range = quill.getSelection();
    
    if (props.context === 'page') {
      // Insert page button with PrimeVue styling
      insertPageButton(quill, range, buttonConfig);
    } else {
      // Insert email button with table structure
      insertEmailButton(quill, range, buttonConfig);
    }
    
    // Close modal and trigger content update
    buttonConfigVisible.value = false;
    handleTextChange();
  }
}

// Insert button for page blocks (PrimeVue Button) - Using simple HTML insertion
function insertPageButton(quill, range, buttonConfig) {
  // Create button HTML
  const buttonHtml = `
    <button 
      class="p-button p-button-primary" 
      style="
        background: var(--int-base);
        border: 2px solid var(--int-hover);
        color: var(--acc2-base);
        padding: 12px 24px;
        border-radius: 8px;
        font-family: 'Open Sans', sans-serif;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: inline-block;
      "
      onclick="window.location.href='${buttonConfig.url}'"
      onmouseover="this.style.background='var(--int-hover)';this.style.color='var(--acc2-base)'"
      onmouseout="this.style.background='var(--int-base)';this.style.color='var(--acc2-base)'"
    >
      ${buttonConfig.text}
    </button>
  `;
  
  // Insert HTML at the current position
  if (range) {
    // Insert new line before button if not at start
    if (range.index > 0) {
      quill.insertText(range.index, '\n', 'user');
      range.index += 1;
    }
    
    // Insert HTML using Quill's clipboard API
    const delta = quill.clipboard.convert(buttonHtml);
    quill.updateContents(delta);
    
    // Insert new line after button
    quill.insertText(range.index + 1, '\n', 'user');
    
    // Set selection after the button
    quill.setSelection(range.index + 2);
  } else {
    // Insert at the end
    const length = quill.getLength();
    
    // Insert new line before button if not empty
    if (length > 1) {
      quill.insertText(length - 1, '\n', 'user');
    }
    
    // Insert HTML at the end
    const delta = quill.clipboard.convert(buttonHtml);
    quill.updateContents(delta);
    
    // Insert new line after button
    quill.insertText(length + 1, '\n', 'user');
    
    // Set selection after the button
    quill.setSelection(length + 2);
  }
}

// Insert button for email templates/messages (table structure)
function insertEmailButton(quill, range, buttonConfig) {
  const buttonMarker = `[BUTTON:${buttonConfig.text}|${buttonConfig.url}]`;
  
  if (range) {
    // Insert new line before button if not at start
    if (range.index > 0) {
      quill.insertText(range.index, '\n', 'user');
      range.index += 1;
    }
    
    // Insert button marker with styling
    quill.insertText(range.index, buttonMarker, {
      'bold': true,
      'color': '#DAA520',
      'background': '#442727'
    });
    
    // Insert new line after button
    quill.insertText(range.index + buttonMarker.length, '\n', 'user');
    
    // Set selection after the button
    quill.setSelection(range.index + buttonMarker.length + 1);
  } else {
    // Insert new line before button if not empty
    const length = quill.getLength();
    
    if (length > 1) {
      quill.insertText(length - 1, '\n', 'user');
    }
    
    // Insert button marker
    quill.insertText(length, buttonMarker, {
      'bold': true,
      'color': '#DAA520',
      'background': '#442727'
    });
    
    // Insert new line after button
    quill.insertText(length + buttonMarker.length, '\n', 'user');
    
    // Set selection after the button
    quill.setSelection(length + buttonMarker.length + 1);
  }
}

// Helper function to insert HTML at a specific position
function insertHtmlAtPosition(quill, range, html) {
  if (range) {
    // Insert new line before button if not at start
    if (range.index > 0) {
      quill.insertText(range.index, '\n', 'user');
      range.index += 1;
    }
    
    // Insert HTML at cursor position
    const currentHtml = quill.root.innerHTML;
    const beforeCursor = currentHtml.substring(0, range.index);
    const afterCursor = currentHtml.substring(range.index);
    const newHtml = beforeCursor + html + afterCursor;
    
    quill.root.innerHTML = newHtml;
    
    // Set cursor position after the inserted button
    quill.setSelection(range.index + html.length);
  } else {
    // Insert at the end
    const currentHtml = quill.root.innerHTML;
    const newHtml = currentHtml + html;
    quill.root.innerHTML = newHtml;
    
    // Set cursor at the end
    quill.setSelection(quill.getLength());
  }
}

// Alternative method: Insert HTML directly into the editor's root
function insertButtonAlternative() {
  const buttonHtml = `
    <a href="#" style="
      display: inline-block;
      padding: 12px 24px;
      background-color: #F1EFE8;
      color: #DAA520;
      text-decoration: none;
      border-radius: 6px;
      font-family: 'Open Sans', sans-serif;
      font-weight: 600;
      font-size: 14px;
      border: 2px solid #DAA520;
      transition: all 0.3s ease;
    ">Button Text</a>
  `;
  
  if (editorRef.value && editorRef.value.quill) {
    const quill = editorRef.value.quill;
    const range = quill.getSelection();
    
    if (range) {
      // Insert HTML directly at the cursor position
      const currentHtml = quill.root.innerHTML;
      const beforeCursor = currentHtml.substring(0, range.index);
      const afterCursor = currentHtml.substring(range.index);
      const newHtml = beforeCursor + buttonHtml + afterCursor;
      
      quill.root.innerHTML = newHtml;
      
      // Set cursor position after the inserted button
      quill.setSelection(range.index + buttonHtml.length);
    } else {
      // Insert at the end
      const currentHtml = quill.root.innerHTML;
      const newHtml = currentHtml + buttonHtml;
      quill.root.innerHTML = newHtml;
      
      // Set cursor at the end
      quill.setSelection(quill.getLength());
    }
    
    // Update the content
    updateContent();
  }
}

// Open image picker
function openImagePicker() {
  pickerVisible.value = true;
}

// Insert image from picker
function insertImage(imageUrl) {
  const quill = editorRef.value.quill;
  const range = quill.getSelection();
  
  if (range) {
    quill.insertEmbed(range.index, 'image', imageUrl);
    quill.setSelection(range.index + 1);
  }
  
  pickerVisible.value = false;
}

// Toggle HTML view
function toggleHtml() {
  showHtml.value = !showHtml.value;
}

// Initialize editor when component mounts
onMounted(() => {
  nextTick(() => {
    if (editorRef.value) {
      // Ensure the editor is properly initialized
      const quill = editorRef.value.quill;
      if (quill && props.modelValue) {
        quill.root.innerHTML = props.modelValue;
        editorContent.value = props.modelValue;
        htmlContent.value = props.modelValue;
      }
    }
  });
});

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (!isInternalUpdate.value && newValue !== editorContent.value) {
    isInternalUpdate.value = true;
    editorContent.value = newValue || '';
    htmlContent.value = newValue || '';
    
    nextTick(() => {
      if (editorRef.value && editorRef.value.quill) {
        const quill = editorRef.value.quill;
        quill.root.innerHTML = newValue || '';
      }
      isInternalUpdate.value = false;
    });
  }
});
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

.ql-toolbar {
  border-top: none;
  border-left: none;
  border-right: none;
  border-bottom: 1px solid #d1d5db;
  background-color: #f9fafb;
}

.ql-editor {
  min-height: 200px;
  font-family: 'Open Sans', sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

/* Custom button styles */
.ql-custom-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  margin: 0 2px;
  border-radius: 3px;
}

.ql-custom-button:hover {
  background-color: #e5e7eb;
}

.ql-custom-image {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  margin: 0 2px;
  border-radius: 3px;
}

.ql-custom-image:hover {
  background-color: #e5e7eb;
}
</style>
