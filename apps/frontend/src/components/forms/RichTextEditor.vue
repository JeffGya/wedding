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
        <div :id="toolbarId" ref="toolbarRef" class="ql-toolbar ql-snow">
          <!-- Header dropdown -->
          <select class="ql-header">
            <option selected></option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="special-title">Special Title</option>

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
          
          <!-- Text alignment buttons -->
          <span class="ql-formats">
            <button class="ql-align" value="" title="Left Align">
              <i class="i-solar:align-left-bold"></i>
            </button>
            <button class="ql-align" value="center" title="Center Align">
              <i class="i-solar:align-center-bold"></i>
            </button>
            <button class="ql-align" value="right" title="Right Align">
              <i class="i-solar:align-right-bold"></i>
            </button>
            <button class="ql-align" value="justify" title="Justify">
              <i class="i-solar:text-align-justify-bold"></i>
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
              <span v-html="quillImageIcon"></span>
            </button>
            <button
              type="button"
              class="ql-custom-image-config"
              @mousedown.prevent
              @click="openImageConfig"
              title="Configure Image"
            >
              <i class="i-solar:settings-bold"></i>
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
              <span v-html="quillButtonIcon"></span>
            </button>
          </span>
          
          <!-- HTML toggle -->
          <span class="ql-formats">
            <button type="button" @mousedown.prevent @click="toggleHtml" title="Toggle HTML">
              <span v-html="quillCodeIcon"></span>
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
    
    <ImageConfigModal
      :visible="imageConfigVisible"
      :imageSrc="selectedImageSrc"
      :currentWidth="selectedImageWidth"
      :currentHeight="selectedImageHeight"
      :currentAlign="selectedImageAlign"
      @close="imageConfigVisible = false"
      @apply="handleImageConfigApply"
    />
    
    <div v-if="showHtml" class="mt-2">
      <textarea 
        v-model="htmlContent" 
        rows="10" 
        class="w-full border rounded p-2" 
        @input="updateFromHtml"
        @focus="onHtmlTextareaFocus"
        @blur="onHtmlTextareaBlur"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import Editor from 'primevue/editor';
import Quill from 'quill';
import ImagePicker from '@/components/ui/ImagePicker.vue';
import ButtonConfigModal from '@/components/ui/ButtonConfigModal.vue';
import ImageConfigModal from '@/components/ui/ImageConfigModal.vue';

// Get Quill's built-in icons
const QuillIcons = Quill.import('ui/icons');

// Register custom font formats
const Font = Quill.import('formats/font');
Font.whitelist = ['serif', 'sans', 'cursive', 'monospace'];
Quill.register(Font, true);

// Register custom title block
const Block = Quill.import('blots/block');
class SpecialTitle extends Block {}
SpecialTitle.blotName = 'specialTitle';
SpecialTitle.tagName = 'h2';
// Don't set className as static property - Quill's Block expects single token
// Store classes separately and apply in create method
const specialTitleClasses = 'font-cursive text-[var(--int-base)] text-center rounded-md sm:text-2xl md:text-3xl lg:text-4xl';

// Override static value to recognize our format from DOM nodes
SpecialTitle.value = function(node) {
  // Check if node has our special classes (font-cursive and text-center are key identifiers)
  if (node && node.classList) {
    const hasSpecialClasses = node.classList.contains('font-cursive') && 
                             node.classList.contains('text-center') &&
                             node.classList.contains('border-bg-glass-border');
    return hasSpecialClasses ? true : null;
  }
  return null;
};

// Add style method to apply background-image
SpecialTitle.create = function(value) {
  let node;
  try {
    node = Block.create.call(this, value);
  } catch (e) {
    throw e;
  }
  // Use value from formats() if available (when loading saved content), otherwise use defaults
  const classesToApply = (value && typeof value === 'object' && value.class) ? value.class : specialTitleClasses;
  const savedStyle = (value && typeof value === 'object' && value.style) ? value.style : null;
  
  // Parse saved style to extract background-image if present
  let backgroundImage = 'var(--bg-glass)'; // default
  if (savedStyle) {
    if (savedStyle.includes('background-image')) {
      const bgMatch = savedStyle.match(/background-image:\s*([^;]+)/);
      if (bgMatch) {
        backgroundImage = bgMatch[1].trim();
      }
    } else {
      // If saved style doesn't have background-image, use it as the background-image value
      backgroundImage = savedStyle;
    }
  }
  
  // Always apply spacing as inline styles to override Quill's default h2 styles
  // These should always be applied, regardless of saved content
  node.style.width = '40%';
  node.style.paddingTop = '1rem';
  node.style.paddingBottom = '.75rem';
  node.style.margin = 'auto';
  node.style.marginTop = '1.5rem';
  node.style.marginBottom = '.75rem';
  node.style.border = '1px solid var(--bg-glass-border)';
  
  // Apply background image style (preserve from saved content if available)
  node.style.backgroundImage = backgroundImage;
  
  // Apply className to node using setAttribute to properly handle multiple classes
  if (classesToApply) {
    node.setAttribute('class', classesToApply);
  }
  return node;
};

// Override formats to preserve class and style attributes
SpecialTitle.formats = function(node) {
  return {
    class: node.getAttribute('class'),
    style: node.getAttribute('style')
  };
};

Quill.register(SpecialTitle, true);

// Register custom image format with resizing support
// Note: Alignment is handled at the block level, not the image level
const Image = Quill.import('formats/image');

class CustomImage extends Image {
  static create(value) {
    let node = super.create(value);
    
    // Always add responsive styles to ensure images scale down on smaller screens
    node.style.maxWidth = '100%';
    node.style.height = 'auto';
    
    // If value is an object with properties, apply them
    if (typeof value === 'object' && value !== null) {
      if (value.src) {
        node.setAttribute('src', value.src);
      }
      if (value.width) {
        const widthValue = value.width.includes('px') || value.width.includes('%') ? value.width : value.width + 'px';
        node.setAttribute('width', value.width);
        node.style.width = widthValue;
        // Ensure max-width is still applied for responsiveness
        node.style.maxWidth = '100%';
      }
      if (value.height) {
        const heightValue = value.height.includes('px') || value.height.includes('%') ? value.height : value.height + 'px';
        node.setAttribute('height', value.height);
        node.style.height = heightValue;
        // When height is set, we still want auto height for responsiveness
        // But preserve the height attribute for aspect ratio hints
        node.style.height = 'auto';
      }
    } else if (typeof value === 'string') {
      // Simple string URL
      node.setAttribute('src', value);
    }
    
    return node;
  }
  
  static value(node) {
    if (node.tagName === 'IMG') {
      return {
        src: node.getAttribute('src') || node.src,
        width: node.getAttribute('width') || node.style.width || '',
        height: node.getAttribute('height') || node.style.height || ''
      };
    }
    return super.value(node);
  }
  
  static formats(node) {
    if (node.tagName === 'IMG') {
      return {
        width: node.getAttribute('width') || node.style.width || '',
        height: node.getAttribute('height') || node.style.height || ''
      };
    }
    return {};
  }
}

Quill.register(CustomImage, true);

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
const isUpdatingFromHtml = ref(false); // Flag to prevent handleTextChange from updating htmlContent when updating from HTML

// Proper modules configuration with toolbar enabled
const toolbarRef = ref(null);
const toolbarId = `ql-toolbar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const modules = {
  toolbar: {
    container: `#${toolbarId}`,
    handlers: {
      header(value) {
        const quill = this.quill;
        if (value === 'special-title') {
          const range = quill.getSelection(true);
          const line = quill.getLine(range.index);
          quill.format('specialTitle', true);
          // Trigger update after format is applied
          nextTick(() => {
            if (editorRef.value && editorRef.value.quill) {
              const currentContent = editorRef.value.quill.root.innerHTML;
              editorContent.value = currentContent;
              htmlContent.value = currentContent;
              emit('update:modelValue', currentContent);
            }
          });
        } else {
          quill.format('header', value);
        }
      },
    },
  },
  clipboard: { matchVisual: false },
};

const formats = [
  'font',
  'size',
  'header',
  'specialTitle',
  'bold',
  'italic',
  'underline',
  'align',
  'list',
  'link',
  'image',
];

const editorRef = ref(null);
const showHtml = ref(false);
const pickerVisible = ref(false);
const buttonConfigVisible = ref(false);
const imageConfigVisible = ref(false);
const selectedImageSrc = ref('');
const selectedImageWidth = ref('');
const selectedImageHeight = ref('');
const selectedImageAlign = ref('');
const selectedImageIndex = ref(null);
const isHtmlTextareaFocused = ref(false); // Track if HTML textarea has focus

// Use Quill's built-in icons directly for custom buttons
const quillImageIcon = QuillIcons.image || '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="10" width="12" x="3" y="4"></rect><circle class="ql-fill" cx="6" cy="7" r="1"></circle><polyline class="ql-even ql-fill" points="5 12 5 11 7 9 8 10 11 7 13 9 13 12 5 12"></polyline></svg>';
const quillButtonIcon = '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="4" width="12" x="3" y="7" rx="2"></rect><line class="ql-stroke" x1="6" x2="6" y1="5" y2="13"></line><line class="ql-stroke" x1="12" x2="12" y1="5" y2="13"></line></svg>';
const quillCodeIcon = QuillIcons['code-block'] || '<svg viewBox="0 0 18 18"><polyline class="ql-stroke" points="5 7 3 9 5 11"></polyline><polyline class="ql-stroke" points="13 7 15 9 13 11"></polyline><line class="ql-stroke" x1="10" x2="8" y1="5" y2="13"></line></svg>';

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
    
    // Only update htmlContent if we're NOT updating from HTML mode
    // This prevents Quill's normalization from overwriting the user's HTML edits
    if (!isUpdatingFromHtml.value) {
      htmlContent.value = processedContent;
    }
    editorContent.value = processedContent;
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
    
    // Ensure the newly inserted image is responsive
    nextTick(() => {
      ensureImagesAreResponsive();
    });
  }
  
  pickerVisible.value = false;
}

// Open image configuration modal
function openImageConfig() {
  const quill = editorRef.value.quill;
  if (!quill) return;
  
  const range = quill.getSelection();
  const editorElement = quill.root;
  
  // Find all images in the editor
  const images = editorElement.querySelectorAll('img');
  if (images.length === 0) return;
  
  let targetImg = null;
  
  if (range) {
    // Try to find image at or near cursor position
    const [line] = quill.getLine(range.index);
    if (line && line.domNode) {
      // Check if line contains an image
      const lineImages = line.domNode.querySelectorAll('img');
      if (lineImages.length > 0) {
        targetImg = lineImages[0];
      } else if (line.domNode.tagName === 'IMG') {
        targetImg = line.domNode;
      }
    }
    
    // If no image found in line, find the closest image by checking DOM position
    if (!targetImg && images.length > 0) {
      // Use the first image in the editor as fallback
      targetImg = images[0];
    }
  }
  
  // If still no image found, use the first image
  if (!targetImg && images.length > 0) {
    targetImg = images[0];
  }
  
  if (targetImg) {
    selectedImageSrc.value = targetImg.src || targetImg.getAttribute('src') || '';
    selectedImageWidth.value = targetImg.getAttribute('width') || targetImg.style.width || '';
    selectedImageHeight.value = targetImg.getAttribute('height') || targetImg.style.height || '';
    
    // Check alignment - look at parent block
    let blockParent = targetImg.parentElement;
    while (blockParent && blockParent !== editorElement && 
           !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockParent.tagName)) {
      blockParent = blockParent.parentElement;
    }
    
    if (blockParent && blockParent !== editorElement && blockParent.style.textAlign) {
      selectedImageAlign.value = blockParent.style.textAlign;
    } else {
      selectedImageAlign.value = '';
    }
    
    imageConfigVisible.value = true;
  }
}

// Handle image configuration apply
function handleImageConfigApply(config) {
  const quill = editorRef.value.quill;
  if (!quill) return;
  
  // Find the image in the editor
  const editorElement = quill.root;
  const images = editorElement.querySelectorAll('img');
  
  let targetImg = null;
  let targetIndex = null;
  
  for (const img of images) {
    const imgSrc = img.src || img.getAttribute('src') || '';
    const selectedSrc = selectedImageSrc.value;
    if (imgSrc === selectedSrc || imgSrc.includes(selectedSrc) || selectedSrc.includes(imgSrc)) {
      targetImg = img;
      // Find the index of this image in the editor
      const allNodes = editorElement.querySelectorAll('*');
      let index = 0;
      for (let i = 0; i < allNodes.length; i++) {
        if (allNodes[i] === img) {
          targetIndex = i;
          break;
        }
      }
      break;
    }
  }
  
  if (targetImg) {
    // Always ensure responsive styles are applied
    targetImg.style.maxWidth = '100%';
    targetImg.style.height = 'auto';
    
    // Update image attributes
    if (config.width) {
      const widthValue = config.width.includes('px') || config.width.includes('%') ? config.width : config.width + 'px';
      targetImg.setAttribute('width', config.width);
      targetImg.style.width = widthValue;
      // Ensure max-width is still applied for responsiveness
      targetImg.style.maxWidth = '100%';
    } else {
      targetImg.removeAttribute('width');
      targetImg.style.width = '';
    }
    
    if (config.height) {
      const heightValue = config.height.includes('px') || config.height.includes('%') ? config.height : config.height + 'px';
      targetImg.setAttribute('height', config.height);
      // Store height in attribute but use auto for actual display to maintain responsiveness
      // The height attribute helps with aspect ratio calculation
      targetImg.style.height = 'auto';
    } else {
      targetImg.removeAttribute('height');
      targetImg.style.height = 'auto';
    }
    
    // Handle alignment by applying text-align to the parent block
    const parent = targetImg.parentElement;
    if (config.align) {
      // Find the block-level parent (p, div, etc.)
      let blockParent = parent;
      while (blockParent && blockParent !== editorElement && 
             !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockParent.tagName)) {
        blockParent = blockParent.parentElement;
      }
      
      if (blockParent && blockParent !== editorElement) {
        blockParent.style.textAlign = config.align;
      } else {
        // If no block parent found, wrap in a div
        if (parent && parent.tagName !== 'DIV') {
          const wrapper = document.createElement('div');
          wrapper.style.textAlign = config.align;
          wrapper.style.display = 'block';
          parent.insertBefore(wrapper, targetImg);
          wrapper.appendChild(targetImg);
        } else if (parent) {
          parent.style.textAlign = config.align;
          parent.style.display = 'block';
        }
      }
    } else {
      // Remove alignment
      let blockParent = parent;
      while (blockParent && blockParent !== editorElement && 
             !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockParent.tagName)) {
        blockParent = blockParent.parentElement;
      }
      
      if (blockParent && blockParent !== editorElement) {
        blockParent.style.textAlign = '';
      }
      
      // If image is wrapped in a div just for alignment, unwrap it
      if (parent && parent.tagName === 'DIV' && parent.style.textAlign && 
          parent.children.length === 1 && parent.children[0] === targetImg) {
        const grandParent = parent.parentElement;
        if (grandParent) {
          grandParent.insertBefore(targetImg, parent);
          grandParent.removeChild(parent);
        }
      }
    }
    
    // Trigger content update
    nextTick(() => {
      handleTextChange();
    });
  }
  
  imageConfigVisible.value = false;
}

// Toggle HTML view
function toggleHtml() {
  showHtml.value = !showHtml.value;
  
  // Sync editor content to HTML when opening HTML mode
  if (showHtml.value && editorRef.value?.quill) {
    // Only sync from Quill if htmlContent is empty or significantly different
    // Otherwise, preserve the existing htmlContent (which may have custom classes)
    if (!htmlContent.value || htmlContent.value.length < 10) {
      const currentHtml = editorRef.value.quill.root.innerHTML;
      htmlContent.value = currentHtml;
    }
    // Preserve existing htmlContent - it may have custom classes that Quill normalized
  } else if (!showHtml.value && editorRef.value?.quill) {
    // When switching back to visual mode, update Quill with the HTML content
    nextTick(() => {
      if (editorRef.value?.quill) {
        isInternalUpdate.value = true;
        const quill = editorRef.value.quill;
        quill.root.innerHTML = htmlContent.value;
        const afterHtml = quill.root.innerHTML;
        editorContent.value = afterHtml;
        emit('update:modelValue', afterHtml);
        isInternalUpdate.value = false;
      }
    });
  }
}

// Update editor content from HTML textarea - uses debouncing to avoid excessive updates
let updateTimeout = null;
function updateFromHtml() {
  // Don't update if this is an internal update from handleTextChange
  // This prevents infinite loops when visual editor updates htmlContent
  if (isInternalUpdate.value) {
    return;
  }
  
  // Clear any pending update
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  // Only update visual editor when textarea loses focus (user stops editing)
  // This prevents Quill from normalizing HTML while user is actively typing
  if (isHtmlTextareaFocused.value) {
    return; // Don't update visual editor while user is typing in HTML mode
  }
  
  // Update visual editor when textarea loses focus
  updateTimeout = setTimeout(() => {
    if (editorRef.value && editorRef.value.quill) {
      isInternalUpdate.value = true;
      isUpdatingFromHtml.value = true; // Set flag to prevent handleTextChange from overwriting htmlContent
      const quill = editorRef.value.quill;
      
      // Directly set innerHTML - Quill will normalize it, but we preserve the user's HTML in htmlContent
      // The flag prevents handleTextChange from overwriting htmlContent with normalized HTML
      quill.root.innerHTML = htmlContent.value;
      const afterHtml = quill.root.innerHTML;
      
      // Update editorContent with normalized HTML (for visual display)
      // But emit the ORIGINAL htmlContent to preserve classes and attributes
      editorContent.value = afterHtml;
      emit('update:modelValue', htmlContent.value); // Emit original HTML to preserve classes
      
      // Reset flags after a short delay to allow any pending text-change events to complete
      setTimeout(() => {
        isInternalUpdate.value = false;
        isUpdatingFromHtml.value = false;
      }, 100);
    }
  }, 100); // Short delay for blur event
}

// Handle HTML textarea focus - don't update visual editor while user is typing
function onHtmlTextareaFocus() {
  isHtmlTextareaFocused.value = true;
  // Clear any pending updates
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
}

// Handle HTML textarea blur - update visual editor when user stops editing
function onHtmlTextareaBlur() {
  isHtmlTextareaFocused.value = false;
  // Trigger update to visual editor now that user stopped editing
  if (editorRef.value && editorRef.value.quill && !isInternalUpdate.value) {
    updateFromHtml();
  }
}

// Function to ensure all images in editor are responsive
function ensureImagesAreResponsive() {
  if (!editorRef.value?.quill) return;
  
  const editorElement = editorRef.value.quill.root;
  const images = editorElement.querySelectorAll('img');
  
  images.forEach(img => {
    // Always ensure responsive styles are applied
    if (!img.style.maxWidth || img.style.maxWidth !== '100%') {
      img.style.maxWidth = '100%';
    }
    if (!img.style.height || img.style.height !== 'auto') {
      // Only set to auto if height wasn't explicitly set to a specific value
      // (though we want auto for responsiveness, so we'll override)
      img.style.height = 'auto';
    }
  });
}

// Initialize editor when component mounts
onMounted(() => {
  nextTick(() => {
    if (editorRef.value) {
      // Ensure the editor is properly initialized
      const quill = editorRef.value.quill;
      if (quill) {
        if (props.modelValue) {
          quill.root.innerHTML = props.modelValue;
          editorContent.value = props.modelValue;
          htmlContent.value = props.modelValue;
        }
        
        // Ensure all existing images are responsive
        ensureImagesAreResponsive();
        
        // Watch for new images being added and make them responsive
        const observer = new MutationObserver(() => {
          ensureImagesAreResponsive();
        });
        
        observer.observe(quill.root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'width', 'height']
        });
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

.ql-custom-image-config {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  margin: 0 2px;
  border-radius: 3px;
}

.ql-custom-image-config:hover {
  background-color: #e5e7eb;
}

/* Override Quill's default h2 styles for special titles */
:deep(.ql-editor h2.font-cursive) {
  margin: 0 !important;
  padding: 2.5rem !important; /* p-40 */
}

/* Ensure width and other Tailwind classes work */
:deep(.ql-editor h2.font-cursive.w-1\/2) {
  width: 50% !important;
}

/* Make all images responsive - they should scale down if larger than viewport */
:deep(.ql-editor img) {
  max-width: 100% !important;
  height: auto !important;
}
</style>

      targetImg = img;
      // Find the index of this image in the editor
      const allNodes = editorElement.querySelectorAll('*');
      let index = 0;
      for (let i = 0; i < allNodes.length; i++) {
        if (allNodes[i] === img) {
          targetIndex = i;
          break;
        }
      }
      break;
    }
  }
  
  if (targetImg) {
    // Always ensure responsive styles are applied
    targetImg.style.maxWidth = '100%';
    targetImg.style.height = 'auto';
    
    // Update image attributes
    if (config.width) {
      const widthValue = config.width.includes('px') || config.width.includes('%') ? config.width : config.width + 'px';
      targetImg.setAttribute('width', config.width);
      targetImg.style.width = widthValue;
      // Ensure max-width is still applied for responsiveness
      targetImg.style.maxWidth = '100%';
    } else {
      targetImg.removeAttribute('width');
      targetImg.style.width = '';
    }
    
    if (config.height) {
      const heightValue = config.height.includes('px') || config.height.includes('%') ? config.height : config.height + 'px';
      targetImg.setAttribute('height', config.height);
      // Store height in attribute but use auto for actual display to maintain responsiveness
      // The height attribute helps with aspect ratio calculation
      targetImg.style.height = 'auto';
    } else {
      targetImg.removeAttribute('height');
      targetImg.style.height = 'auto';
    }
    
    // Handle alignment by applying text-align to the parent block
    const parent = targetImg.parentElement;
    if (config.align) {
      // Find the block-level parent (p, div, etc.)
      let blockParent = parent;
      while (blockParent && blockParent !== editorElement && 
             !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockParent.tagName)) {
        blockParent = blockParent.parentElement;
      }
      
      if (blockParent && blockParent !== editorElement) {
        blockParent.style.textAlign = config.align;
      } else {
        // If no block parent found, wrap in a div
        if (parent && parent.tagName !== 'DIV') {
          const wrapper = document.createElement('div');
          wrapper.style.textAlign = config.align;
          wrapper.style.display = 'block';
          parent.insertBefore(wrapper, targetImg);
          wrapper.appendChild(targetImg);
        } else if (parent) {
          parent.style.textAlign = config.align;
          parent.style.display = 'block';
        }
      }
    } else {
      // Remove alignment
      let blockParent = parent;
      while (blockParent && blockParent !== editorElement && 
             !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockParent.tagName)) {
        blockParent = blockParent.parentElement;
      }
      
      if (blockParent && blockParent !== editorElement) {
        blockParent.style.textAlign = '';
      }
      
      // If image is wrapped in a div just for alignment, unwrap it
      if (parent && parent.tagName === 'DIV' && parent.style.textAlign && 
          parent.children.length === 1 && parent.children[0] === targetImg) {
        const grandParent = parent.parentElement;
        if (grandParent) {
          grandParent.insertBefore(targetImg, parent);
          grandParent.removeChild(parent);
        }
      }
    }
    
    // Trigger content update
    nextTick(() => {
      handleTextChange();
    });
  }
  
  imageConfigVisible.value = false;
}

// Toggle HTML view
function toggleHtml() {
  showHtml.value = !showHtml.value;
  
  // Sync editor content to HTML when opening HTML mode
  if (showHtml.value && editorRef.value?.quill) {
    // Only sync from Quill if htmlContent is empty or significantly different
    // Otherwise, preserve the existing htmlContent (which may have custom classes)
    if (!htmlContent.value || htmlContent.value.length < 10) {
      const currentHtml = editorRef.value.quill.root.innerHTML;
      htmlContent.value = currentHtml;
    }
    // Preserve existing htmlContent - it may have custom classes that Quill normalized
  } else if (!showHtml.value && editorRef.value?.quill) {
    // When switching back to visual mode, update Quill with the HTML content
    nextTick(() => {
      if (editorRef.value?.quill) {
        isInternalUpdate.value = true;
        const quill = editorRef.value.quill;
        quill.root.innerHTML = htmlContent.value;
        const afterHtml = quill.root.innerHTML;
        editorContent.value = afterHtml;
        emit('update:modelValue', afterHtml);
        isInternalUpdate.value = false;
      }
    });
  }
}

// Update editor content from HTML textarea - uses debouncing to avoid excessive updates
let updateTimeout = null;
function updateFromHtml() {
  // Don't update if this is an internal update from handleTextChange
  // This prevents infinite loops when visual editor updates htmlContent
  if (isInternalUpdate.value) {
    return;
  }
  
  // Clear any pending update
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  // Only update visual editor when textarea loses focus (user stops editing)
  // This prevents Quill from normalizing HTML while user is actively typing
  if (isHtmlTextareaFocused.value) {
    return; // Don't update visual editor while user is typing in HTML mode
  }
  
  // Update visual editor when textarea loses focus
  updateTimeout = setTimeout(() => {
    if (editorRef.value && editorRef.value.quill) {
      isInternalUpdate.value = true;
      isUpdatingFromHtml.value = true; // Set flag to prevent handleTextChange from overwriting htmlContent
      const quill = editorRef.value.quill;
      
      // Directly set innerHTML - Quill will normalize it, but we preserve the user's HTML in htmlContent
      // The flag prevents handleTextChange from overwriting htmlContent with normalized HTML
      quill.root.innerHTML = htmlContent.value;
      const afterHtml = quill.root.innerHTML;
      
      // Update editorContent with normalized HTML (for visual display)
      // But emit the ORIGINAL htmlContent to preserve classes and attributes
      editorContent.value = afterHtml;
      emit('update:modelValue', htmlContent.value); // Emit original HTML to preserve classes
      
      // Reset flags after a short delay to allow any pending text-change events to complete
      setTimeout(() => {
        isInternalUpdate.value = false;
        isUpdatingFromHtml.value = false;
      }, 100);
    }
  }, 100); // Short delay for blur event
}

// Handle HTML textarea focus - don't update visual editor while user is typing
function onHtmlTextareaFocus() {
  isHtmlTextareaFocused.value = true;
  // Clear any pending updates
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
}

// Handle HTML textarea blur - update visual editor when user stops editing
function onHtmlTextareaBlur() {
  isHtmlTextareaFocused.value = false;
  // Trigger update to visual editor now that user stopped editing
  if (editorRef.value && editorRef.value.quill && !isInternalUpdate.value) {
    updateFromHtml();
  }
}

// Function to ensure all images in editor are responsive
function ensureImagesAreResponsive() {
  if (!editorRef.value?.quill) return;
  
  const editorElement = editorRef.value.quill.root;
  const images = editorElement.querySelectorAll('img');
  
  images.forEach(img => {
    // Always ensure responsive styles are applied
    if (!img.style.maxWidth || img.style.maxWidth !== '100%') {
      img.style.maxWidth = '100%';
    }
    if (!img.style.height || img.style.height !== 'auto') {
      // Only set to auto if height wasn't explicitly set to a specific value
      // (though we want auto for responsiveness, so we'll override)
      img.style.height = 'auto';
    }
  });
}

// Initialize editor when component mounts
onMounted(() => {
  nextTick(() => {
    if (editorRef.value) {
      // Ensure the editor is properly initialized
      const quill = editorRef.value.quill;
      if (quill) {
        if (props.modelValue) {
          quill.root.innerHTML = props.modelValue;
          editorContent.value = props.modelValue;
          htmlContent.value = props.modelValue;
        }
        
        // Ensure all existing images are responsive
        ensureImagesAreResponsive();
        
        // Watch for new images being added and make them responsive
        const observer = new MutationObserver(() => {
          ensureImagesAreResponsive();
        });
        
        observer.observe(quill.root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'width', 'height']
        });
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

.ql-custom-image-config {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  margin: 0 2px;
  border-radius: 3px;
}

.ql-custom-image-config:hover {
  background-color: #e5e7eb;
}

/* Override Quill's default h2 styles for special titles */
:deep(.ql-editor h2.font-cursive) {
  margin: 0 !important;
  padding: 2.5rem !important; /* p-40 */
}

/* Ensure width and other Tailwind classes work */
:deep(.ql-editor h2.font-cursive.w-1\/2) {
  width: 50% !important;
}

/* Make all images responsive - they should scale down if larger than viewport */
:deep(.ql-editor img) {
  max-width: 100% !important;
  height: auto !important;
}
</style>
