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
          
          <!-- Email Section Controls (email context only) -->
          <span v-if="context === 'email'" class="ql-formats">
            <!-- Top Overlay Image -->
            <button
              type="button"
              class="ql-custom-top-overlay-image"
              @mousedown.prevent
              @click="openTopOverlayImagePicker"
              title="Insert Top Overlay Image"
            >
              <i class="i-solar:picture-bold"></i>
            </button>
            <button
              v-if="storedTopOverlayImageUrl"
              type="button"
              class="ql-custom-remove"
              @mousedown.prevent
              @click="clearTopOverlayImage"
              title="Remove Top Overlay Image"
            >
              <i class="i-solar:close-circle-bold"></i>
            </button>
            <!-- Hero Image (replaces Header Image) -->
            <button
              type="button"
              class="ql-custom-hero-image"
              @mousedown.prevent
              @click="openHeroImagePicker"
              title="Insert Hero Image"
              ref="heroImageButtonRef"
            >
              <i class="i-solar:gallery-bold" ref="heroImageIconRef"></i>
            </button>
            <button
              v-if="storedHeroImageUrl"
              type="button"
              class="ql-custom-remove"
              @mousedown.prevent
              @click="clearHeroImage"
              title="Remove Hero Image"
            >
              <i class="i-solar:close-circle-bold"></i>
            </button>
            <!-- Email Title -->
            <button
              type="button"
              class="ql-custom-email-title"
              @mousedown.prevent
              @click="openEmailTitleDialog"
              title="Set Email Title"
            >
              <i class="i-solar:text-field-bold"></i>
            </button>
            <!-- Preheader -->
            <button
              type="button"
              class="ql-custom-preheader"
              @mousedown.prevent
              @click="openPreheaderDialog"
              title="Set Preheader Text"
            >
              <i class="i-solar:document-text-bold"></i>
            </button>
            <!-- Hero Subtitle -->
            <button
              type="button"
              class="ql-custom-hero-subtitle"
              @mousedown.prevent
              @click="openHeroSubtitleDialog"
              title="Set Hero Subtitle"
            >
              <i class="i-solar:text-bold"></i>
            </button>
            <!-- Info Card Toggle -->
            <button
              type="button"
              class="ql-custom-info-card"
              @mousedown.prevent
              @click="toggleInfoCard"
              title="Toggle Info Card"
            >
              <i class="i-solar:card-bold"></i>
            </button>
            <!-- Info Card Labels -->
            <button
              type="button"
              class="ql-custom-info-card-labels"
              @mousedown.prevent
              @click="openInfoCardLabelsDialog"
              title="Customize Info Card Labels"
            >
              <i class="i-solar:tag-bold"></i>
            </button>
            <!-- RSVP Code Toggle -->
            <button
              type="button"
              class="ql-custom-rsvp-code"
              :class="{ 'ql-active': storedRsvpCodeEnabled === true }"
              @mousedown.prevent
              @click="toggleRsvpCode"
              :title="getRsvpCodeToggleTitle()"
            >
              <i class="i-solar:key-bold"></i>
            </button>
            <!-- Secondary Information -->
            <button
              type="button"
              class="ql-custom-secondary-info"
              @mousedown.prevent
              @click="openSecondaryInfoDialog"
              title="Add Secondary Information"
            >
              <i class="i-solar:info-circle-bold"></i>
            </button>
            <button
              v-if="storedSecondaryInfo"
              type="button"
              class="ql-custom-remove"
              @mousedown.prevent
              @click="clearSecondaryInfo"
              title="Remove Secondary Information"
            >
              <i class="i-solar:close-circle-bold"></i>
            </button>
            <!-- Button -->
            <button
              type="button"
              class="ql-custom-button"
              @mousedown.prevent
              @click="openButtonDialog"
              title="Add Button"
            >
              <i class="i-solar:button-bold"></i>
            </button>
            <button
              v-if="storedButton"
              type="button"
              class="ql-custom-remove"
              @mousedown.prevent
              @click="clearButton"
              title="Remove Button"
            >
              <i class="i-solar:close-circle-bold"></i>
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
    
    <ImagePicker
      :visible="heroImagePickerVisible"
      @update:visible="heroImagePickerVisible = $event"
      @select="insertHeroImage"
    />
    
    <ImagePicker
      :visible="topOverlayImagePickerVisible"
      @update:visible="topOverlayImagePickerVisible = $event"
      @select="insertTopOverlayImage"
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
    
    <!-- Email Title Dialog -->
    <Dialog
      v-model:visible="emailTitleDialogVisible"
      header="Set Email Title"
      :modal="true"
      :draggable="false"
      :closable="true"
      class="w-full max-w-md"
      :pt="{
        root: { class: 'bg-bg-glass border border-bg-glass-border rounded-xl shadow-lg' },
        header: { class: 'text-int-base font-cursive text-xl pb-2' },
        content: { class: 'p-4' }
      }"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Title Text</label>
          <InputText
            v-model="emailTitleInput"
            placeholder="e.g., You're Invited!"
            class="w-full"
          />
          <p class="text-xs text-int-secondary mt-1">This title will appear under the logo in the email.</p>
        </div>
        <div class="flex justify-between items-center mt-2">
          <Button
            v-if="storedEmailTitle"
            label="Clear"
            severity="danger"
            outlined
            @click="clearEmailTitle"
          />
          <div v-else></div>
          <div class="flex gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            @click="emailTitleDialogVisible = false"
          />
          <Button
            label="Apply"
            @click="insertEmailTitle"
          />
          </div>
        </div>
      </div>
    </Dialog>
    
    <!-- Preheader Dialog -->
    <Dialog
      v-model:visible="preheaderDialogVisible"
      header="Set Preheader Text"
      :modal="true"
      :draggable="false"
      :closable="true"
      class="w-full max-w-md"
      :pt="{
        root: { class: 'bg-bg-glass border border-bg-glass-border rounded-xl shadow-lg' },
        header: { class: 'text-int-base font-cursive text-xl pb-2' },
        content: { class: 'p-4' }
      }"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Preheader Text</label>
          <InputText
            v-model="preheaderInput"
            placeholder="e.g., We can't wait to celebrate with you"
            class="w-full"
          />
          <p class="text-xs text-int-secondary mt-1">This text appears in email client previews but is hidden in the email body.</p>
        </div>
        <div class="flex justify-between items-center mt-2">
          <Button
            v-if="storedPreheader"
            label="Clear"
            severity="danger"
            outlined
            @click="clearPreheader"
          />
          <div v-else></div>
          <div class="flex gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              @click="preheaderDialogVisible = false"
            />
            <Button
              label="Apply"
              @click="insertPreheader"
            />
          </div>
        </div>
      </div>
    </Dialog>
    
    <!-- Hero Subtitle Dialog -->
    <Dialog
      v-model:visible="heroSubtitleDialogVisible"
      header="Set Hero Subtitle"
      :modal="true"
      :draggable="false"
      :closable="true"
      class="w-full max-w-md"
      :pt="{
        root: { class: 'bg-bg-glass border border-bg-glass-border rounded-xl shadow-lg' },
        header: { class: 'text-int-base font-cursive text-xl pb-2' },
        content: { class: 'p-4' }
      }"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Subtitle Text</label>
          <InputText
            v-model="heroSubtitleInput"
            placeholder="e.g., Join us for our special day"
            class="w-full"
          />
          <p class="text-xs text-int-secondary mt-1">This subtitle appears below the main title in the hero section.</p>
        </div>
        <div class="flex justify-between items-center mt-2">
          <Button
            v-if="storedHeroSubtitle"
            label="Clear"
            severity="danger"
            outlined
            @click="clearHeroSubtitle"
          />
          <div v-else></div>
          <div class="flex gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              @click="heroSubtitleDialogVisible = false"
            />
            <Button
              label="Apply"
              @click="insertHeroSubtitle"
            />
          </div>
        </div>
      </div>
    </Dialog>
    
    <!-- Info Card Labels Dialog -->
    <Dialog
      v-model:visible="infoCardLabelsDialogVisible"
      header="Customize Info Card Labels"
      :modal="true"
      :draggable="false"
      :closable="true"
      class="w-full max-w-md"
      :pt="{
        root: { class: 'bg-bg-glass border border-bg-glass-border rounded-xl shadow-lg' },
        header: { class: 'text-int-base font-cursive text-xl pb-2' },
        content: { class: 'p-4' }
      }"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Date Label</label>
          <InputText
            v-model="infoCardLabelsInput.date"
            placeholder="e.g., Wedding Date"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Location Label</label>
          <InputText
            v-model="infoCardLabelsInput.location"
            placeholder="e.g., Venue"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Time Label</label>
          <InputText
            v-model="infoCardLabelsInput.time"
            placeholder="e.g., Start Time"
            class="w-full"
          />
        </div>
        <p class="text-xs text-int-secondary">Leave blank to use default labels.</p>
        <div class="flex justify-between items-center mt-2">
          <Button
            v-if="storedInfoCardLabels.date || storedInfoCardLabels.location || storedInfoCardLabels.time"
            label="Clear"
            severity="danger"
            outlined
            @click="clearInfoCardLabels"
          />
          <div v-else></div>
          <div class="flex gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              @click="infoCardLabelsDialogVisible = false"
            />
            <Button
              label="Apply"
              @click="insertInfoCardLabels"
            />
          </div>
        </div>
      </div>
    </Dialog>
    
    <!-- Button Dialog -->
    <Dialog
      v-model:visible="buttonDialogVisible"
      header="Add Button"
      :modal="true"
      :draggable="false"
      :closable="true"
      class="w-full max-w-md"
      :pt="{
        root: { class: 'bg-bg-glass border border-bg-glass-border rounded-xl shadow-lg' },
        header: { class: 'text-int-base font-cursive text-xl pb-2' },
        content: { class: 'p-4' }
      }"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Button Text</label>
          <InputText
            v-model="buttonTextInput"
            :placeholder="getButtonTextPlaceholder()"
            class="w-full"
          />
          <p class="text-xs text-int-secondary mt-1">The text displayed on the button.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Link Type</label>
          <Select
            v-model="buttonTypeInput"
            :options="[
              { label: 'Home', value: 'home' },
              { label: 'RSVP', value: 'rsvp' },
              { label: 'Page', value: 'page' }
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="Select link type"
            class="w-full"
          />
        </div>
        <div v-if="buttonTypeInput === 'page'">
          <label class="block text-sm font-medium text-int-base mb-1">Page</label>
          <Select
            v-model="buttonPageSlugInput"
            :options="availablePages"
            optionLabel="label"
            optionValue="value"
            placeholder="Select a page"
            class="w-full"
            :loading="availablePages.length === 0"
          />
          <p class="text-xs text-int-secondary mt-1">Select a published page to link to.</p>
        </div>
        <div class="flex justify-between items-center mt-2">
          <Button
            v-if="storedButton"
            label="Clear"
            severity="danger"
            outlined
            @click="clearButton"
          />
          <div v-else></div>
          <div class="flex gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              @click="buttonDialogVisible = false"
            />
            <Button
              label="Apply"
              @click="insertButton"
              :disabled="!buttonTextInput.trim() || (buttonTypeInput === 'page' && !buttonPageSlugInput)"
            />
          </div>
        </div>
      </div>
    </Dialog>
    
    <!-- Secondary Information Dialog -->
    <Dialog
      v-model:visible="secondaryInfoDialogVisible"
      header="Add Secondary Information"
      :modal="true"
      :draggable="false"
      :closable="true"
      class="w-full max-w-md"
      :pt="{
        root: { class: 'bg-bg-glass border border-bg-glass-border rounded-xl shadow-lg' },
        header: { class: 'text-int-base font-cursive text-xl pb-2' },
        content: { class: 'p-4' }
      }"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-int-base mb-1">Secondary Information</label>
          <Textarea
            v-model="secondaryInfoInput"
            placeholder="Enter additional information..."
            rows="4"
            class="w-full"
          />
          <p class="text-xs text-int-secondary mt-1">This information appears after the primary CTA button.</p>
        </div>
        <div class="flex justify-between items-center mt-2">
          <Button
            v-if="storedSecondaryInfo"
            label="Clear"
            severity="danger"
            outlined
            @click="clearSecondaryInfo"
          />
          <div v-else></div>
          <div class="flex gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              @click="secondaryInfoDialogVisible = false"
            />
            <Button
              label="Apply"
              @click="insertSecondaryInfo"
            />
          </div>
        </div>
      </div>
    </Dialog>
    
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
import ImageConfigModal from '@/components/ui/ImageConfigModal.vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Select from 'primevue/select';
import api from '@/api';

// Suppress Quill warnings for custom toolbar buttons that don't use formats
// These buttons use click handlers instead of Quill formats
const originalWarn = console.warn;
console.warn = function(...args) {
  const message = args[0]?.toString() || '';
  // Filter out Quill toolbar warnings about nonexistent custom formats
  // These warnings are harmless - custom buttons use click handlers, not Quill formats
  if (message.includes('quill:toolbar ignoring attaching to nonexistent format')) {
    return; // Suppress these specific warnings
  }
  // Call original warn for all other messages
  originalWarn.apply(console, args);
};

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
const heroImagePickerVisible = ref(false); // For hero image insertion
const topOverlayImagePickerVisible = ref(false); // For top overlay image insertion
const emailTitleDialogVisible = ref(false); // For email title input
const preheaderDialogVisible = ref(false);
const heroSubtitleDialogVisible = ref(false);
const infoCardLabelsDialogVisible = ref(false);
const secondaryInfoDialogVisible = ref(false);
const buttonDialogVisible = ref(false);

// State for new markers
const storedPreheader = ref(null);
const storedHeroSubtitle = ref(null);
const storedInfoCardEnabled = ref(null); // null, true, or false
const storedInfoCardLabels = ref({ date: null, location: null, time: null });
const storedRsvpCodeEnabled = ref(null);
const storedSecondaryInfo = ref(null);
const storedButton = ref(null); // { text: string, type: 'home' | 'rsvp' | 'page', value: string }

// Dialog input values
const preheaderInput = ref('');
const buttonTextInput = ref('');
const buttonTypeInput = ref('home');
const buttonPageSlugInput = ref(null);
const availablePages = ref([]);
const heroSubtitleInput = ref('');
const infoCardLabelsInput = ref({ date: '', location: '', time: '' });
const secondaryInfoInput = ref('');
const emailTitleInput = ref(''); // Current email title input value
const imageConfigVisible = ref(false);
const selectedImageSrc = ref('');
const selectedImageWidth = ref('');
const selectedImageHeight = ref('');
const selectedImageAlign = ref('');
const selectedImageIndex = ref(null);
const isHtmlTextareaFocused = ref(false); // Track if HTML textarea has focus

// Store email markers separately (Quill strips HTML comments)
const storedTopOverlayImageUrl = ref(null);
const storedHeroImageUrl = ref(null);
const storedEmailTitle = ref(null);

// Store toolbar state (header, size, font) for persistence across language switches
const storedToolbarState = ref({
  header: null,
  size: null,
  font: null
});

// Extract markers from initial content (in order: Top Overlay Image, Preheader, Hero Image, Hero Subtitle, Email Title, Info Card Config, RSVP Code, Secondary Info, Button)
function extractMarkersFromContent(content) {
  if (!content) {
    return {
      topOverlayImage: null,
      preheader: null,
      heroImage: null,
      heroSubtitle: null,
      emailTitle: null,
      infoCardEnabled: null,
      infoCardLabels: { date: null, location: null, time: null },
      rsvpCodeEnabled: null,
      secondaryInfo: null,
      button: null,
      toolbarState: { header: null, size: null, font: null },
      cleanedContent: content
    };
  }
  
  let cleanedContent = content;
  let topOverlayImage = null;
  let preheader = null;
  let heroImage = null;
  let heroSubtitle = null;
  let emailTitle = null;
  let infoCardEnabled = null;
  let infoCardLabels = { date: null, location: null, time: null };
  let rsvpCodeEnabled = null;
  let secondaryInfo = null;
  let button = null;
  let toolbarState = { header: null, size: null, font: null };
  
  // 1. Extract TOP_OVERLAY_IMAGE marker
  const topOverlayImageMatch = cleanedContent.match(/<!--TOP_OVERLAY_IMAGE:(.*?)-->/);
  if (topOverlayImageMatch) {
    topOverlayImage = topOverlayImageMatch[1].trim();
    cleanedContent = cleanedContent.replace(topOverlayImageMatch[0], '').trim();
  }
  
  // 2. Extract PREHEADER marker
  const preheaderMatch = cleanedContent.match(/<!--PREHEADER:(.*?)-->/);
  if (preheaderMatch) {
    preheader = preheaderMatch[1].trim();
    cleanedContent = cleanedContent.replace(preheaderMatch[0], '').trim();
  }
  
  // 3. Extract HERO_IMAGE marker (also supports old HEADER_IMAGE for backward compatibility)
  const heroMatch = cleanedContent.match(/<!--HERO_IMAGE:(.*?)-->/);
  const headerMatch = cleanedContent.match(/<!--HEADER_IMAGE:(.*?)-->/); // Backward compatibility
  if (heroMatch) {
    heroImage = heroMatch[1].trim();
    cleanedContent = cleanedContent.replace(heroMatch[0], '').trim();
  } else if (headerMatch) {
    // Convert old HEADER_IMAGE to hero image
    heroImage = headerMatch[1].trim();
    cleanedContent = cleanedContent.replace(headerMatch[0], '').trim();
  }
  
  // 4. Extract HERO_SUBTITLE marker
  const heroSubtitleMatch = cleanedContent.match(/<!--HERO_SUBTITLE:(.*?)-->/);
  if (heroSubtitleMatch) {
    heroSubtitle = heroSubtitleMatch[1].trim();
    cleanedContent = cleanedContent.replace(heroSubtitleMatch[0], '').trim();
  }
  
  // 5. Extract EMAIL_TITLE marker
  const titleMatch = cleanedContent.match(/<!--EMAIL_TITLE:(.*?)-->/);
  if (titleMatch) {
    emailTitle = titleMatch[1].trim();
    cleanedContent = cleanedContent.replace(titleMatch[0], '').trim();
  }
  
  // 6. Extract INFO_CARD config (toggle + labels)
  const infoCardToggleMatch = cleanedContent.match(/<!--INFO_CARD:(enabled|disabled)-->/);
  if (infoCardToggleMatch) {
    infoCardEnabled = infoCardToggleMatch[1] === 'enabled';
    cleanedContent = cleanedContent.replace(infoCardToggleMatch[0], '').trim();
  }
  
  const infoCardDateLabelMatch = cleanedContent.match(/<!--INFO_CARD_DATE_LABEL:(.*?)-->/);
  if (infoCardDateLabelMatch) {
    infoCardLabels.date = infoCardDateLabelMatch[1].trim();
    cleanedContent = cleanedContent.replace(infoCardDateLabelMatch[0], '').trim();
  }
  
  const infoCardLocationLabelMatch = cleanedContent.match(/<!--INFO_CARD_LOCATION_LABEL:(.*?)-->/);
  if (infoCardLocationLabelMatch) {
    infoCardLabels.location = infoCardLocationLabelMatch[1].trim();
    cleanedContent = cleanedContent.replace(infoCardLocationLabelMatch[0], '').trim();
  }
  
  const infoCardTimeLabelMatch = cleanedContent.match(/<!--INFO_CARD_TIME_LABEL:(.*?)-->/);
  if (infoCardTimeLabelMatch) {
    infoCardLabels.time = infoCardTimeLabelMatch[1].trim();
    cleanedContent = cleanedContent.replace(infoCardTimeLabelMatch[0], '').trim();
  }
  
  // 7. Extract RSVP_CODE toggle
  const rsvpCodeMatch = cleanedContent.match(/<!--RSVP_CODE:(enabled|disabled)-->/);
  if (rsvpCodeMatch) {
    rsvpCodeEnabled = rsvpCodeMatch[1] === 'enabled';
    cleanedContent = cleanedContent.replace(rsvpCodeMatch[0], '').trim();
  }
  
  // 8. Extract SECONDARY_INFO marker
  const secondaryInfoMatch = cleanedContent.match(/<!--SECONDARY_INFO:(.*?)-->/);
  if (secondaryInfoMatch) {
    secondaryInfo = secondaryInfoMatch[1].trim();
    cleanedContent = cleanedContent.replace(secondaryInfoMatch[0], '').trim();
  }
  
  // 9. Extract BUTTON marker
  const buttonMatch = cleanedContent.match(/<!--BUTTON:([^|]+)\|([^|]+)\|([^>]*)-->/);
  if (buttonMatch) {
    const buttonText = buttonMatch[1].trim();
    const buttonType = buttonMatch[2].trim();
    const buttonValue = buttonMatch[3].trim();
    
    // Check for multiple button markers
    const allButtonMatches = cleanedContent.match(/<!--BUTTON:[^>]+-->/g);
    if (allButtonMatches && allButtonMatches.length > 1) {
      // Multiple button markers detected - extract the first one
    }
    
    button = {
      text: buttonText,
      type: buttonType,
      value: buttonValue
    };
    cleanedContent = cleanedContent.replace(buttonMatch[0], '').trim();
  }
  
  // 10. Extract TOOLBAR_STATE marker (format: <!--TOOLBAR_STATE:header|size|font-->)
  const toolbarStateMatch = cleanedContent.match(/<!--TOOLBAR_STATE:([^|]*)\|([^|]*)\|([^>]*)-->/);
  if (toolbarStateMatch) {
    toolbarState = {
      header: toolbarStateMatch[1].trim() || null,
      size: toolbarStateMatch[2].trim() || null,
      font: toolbarStateMatch[3].trim() || null
    };
    cleanedContent = cleanedContent.replace(toolbarStateMatch[0], '').trim();
  }
  
  return {
    topOverlayImage,
    preheader,
    heroImage,
    heroSubtitle,
    emailTitle,
    infoCardEnabled,
    infoCardLabels,
    rsvpCodeEnabled,
    secondaryInfo,
    button,
    toolbarState,
    cleanedContent
  };
}

// Inject markers back into content for saving (in order: Top Overlay Image, Preheader, Hero Image, Hero Subtitle, Email Title, Info Card Config, RSVP Code, Secondary Info, Button)
function injectMarkersIntoContent(content) {
  if (props.context !== 'email') return content;
  
  let result = content || '';
  const markers = [];
  
  // 1. Top Overlay Image
  if (storedTopOverlayImageUrl.value) {
    markers.push(`<!--TOP_OVERLAY_IMAGE:${storedTopOverlayImageUrl.value}-->`);
  }
  
  // 2. Preheader
  if (storedPreheader.value) {
    markers.push(`<!--PREHEADER:${storedPreheader.value}-->`);
  }
  
  // 3. Hero Image
  if (storedHeroImageUrl.value) {
    markers.push(`<!--HERO_IMAGE:${storedHeroImageUrl.value}-->`);
  }
  
  // 4. Hero Subtitle
  if (storedHeroSubtitle.value) {
    markers.push(`<!--HERO_SUBTITLE:${storedHeroSubtitle.value}-->`);
  }
  
  // 5. Email Title
  if (storedEmailTitle.value) {
    markers.push(`<!--EMAIL_TITLE:${storedEmailTitle.value}-->`);
  }
  
  // 6. Info Card Config
  if (storedInfoCardEnabled.value !== null) {
    markers.push(`<!--INFO_CARD:${storedInfoCardEnabled.value ? 'enabled' : 'disabled'}-->`);
  }
  if (storedInfoCardLabels.value.date) {
    markers.push(`<!--INFO_CARD_DATE_LABEL:${storedInfoCardLabels.value.date}-->`);
  }
  if (storedInfoCardLabels.value.location) {
    markers.push(`<!--INFO_CARD_LOCATION_LABEL:${storedInfoCardLabels.value.location}-->`);
  }
  if (storedInfoCardLabels.value.time) {
    markers.push(`<!--INFO_CARD_TIME_LABEL:${storedInfoCardLabels.value.time}-->`);
  }
  
  // 7. RSVP Code Toggle
  if (storedRsvpCodeEnabled.value !== null) {
    markers.push(`<!--RSVP_CODE:${storedRsvpCodeEnabled.value ? 'enabled' : 'disabled'}-->`);
  }
  
  // 8. Secondary Info
  if (storedSecondaryInfo.value) {
    markers.push(`<!--SECONDARY_INFO:${storedSecondaryInfo.value}-->`);
  }
  
  // 9. Button
  if (storedButton.value) {
    const value = storedButton.value.value || '';
    const marker = `<!--BUTTON:${storedButton.value.text}|${storedButton.value.type}|${value}-->`;
    markers.push(marker);
  }
  
  // 10. Toolbar State
  if (storedToolbarState.value.header || storedToolbarState.value.size || storedToolbarState.value.font) {
    const header = storedToolbarState.value.header || '';
    const size = storedToolbarState.value.size || '';
    const font = storedToolbarState.value.font || '';
    markers.push(`<!--TOOLBAR_STATE:${header}|${size}|${font}-->`);
  }
  
  // Prepend all markers
  if (markers.length > 0) {
    result = markers.join('\n') + '\n' + result;
  }
  
  return result;
}

// Use Quill's built-in icons directly for custom buttons
const quillImageIcon = QuillIcons.image || '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="10" width="12" x="3" y="4"></rect><circle class="ql-fill" cx="6" cy="7" r="1"></circle><polyline class="ql-even ql-fill" points="5 12 5 11 7 9 8 10 11 7 13 9 13 12 5 12"></polyline></svg>';
const quillCodeIcon = QuillIcons['code-block'] || '<svg viewBox="0 0 18 18"><polyline class="ql-stroke" points="5 7 3 9 5 11"></polyline><polyline class="ql-stroke" points="13 7 15 9 13 11"></polyline><line class="ql-stroke" x1="10" x2="8" y1="5" y2="13"></line></svg>';

// Enhanced function to convert button markers to proper HTML based on context
function convertButtonMarkersToHtml(content) {
  if (!content) return content;
  
  let processedContent = content;
  
  if (props.context === 'page') {
    // Page buttons are already HTML, no conversion needed
    return processedContent;
  } else {
    // Convert new email button markers <!--BUTTON:text|type|value--> to styled button for preview
    // This renders as visual-only button (not clickable) in the editor preview
    processedContent = processedContent.replace(
      /<!--BUTTON:([^|]+)\|([^|]+)\|([^>]*)-->/g,
      (match, buttonText, buttonType, buttonValue) => {
        // Generate placeholder URL based on type (for display only)
        let displayUrl = '#';
        if (buttonType === 'home') {
          displayUrl = '/en/home';
        } else if (buttonType === 'rsvp') {
          displayUrl = '/en/rsvp';
        } else if (buttonType === 'page' && buttonValue) {
          displayUrl = `/en/pages/${buttonValue}`;
        }
        
        // Render as styled button (visual only, not clickable)
        return `
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin: 24px auto; max-width: 320px; width: 100%;">
            <tr>
              <td style="background-color: #DAA520; border-radius: 16px; padding: 16px; text-align: center; mso-padding-alt: 0;">
                <span style="font-family: 'Open Sans', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #442727; text-decoration: none; display: inline-block; line-height: 48px; min-height: 48px; pointer-events: none; cursor: default;">
                ${buttonText}
                </span>
            </td>
          </tr>
        </table>
        `;
      }
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
    
    // Inject stored markers back into content for email context
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    // Only update htmlContent if we're NOT updating from HTML mode
    // This prevents Quill's normalization from overwriting the user's HTML edits
    if (!isUpdatingFromHtml.value) {
      htmlContent.value = contentWithMarkers;
    }
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
    isInternalUpdate.value = false;
  }
}


// Open image picker
function openImagePicker() {
  pickerVisible.value = true;
}

// Open hero image picker (for email templates)
function openHeroImagePicker() {
  heroImagePickerVisible.value = true;
}

// Insert hero image marker at the beginning of content
function insertHeroImage(imageUrl) {
  // Store the hero image URL (Quill strips HTML comments, so we store separately)
  storedHeroImageUrl.value = imageUrl;
  
  // Trigger content update to emit the new content with marker
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    htmlContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  heroImagePickerVisible.value = false;
}

function clearHeroImage() {
  storedHeroImageUrl.value = null;
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    editorContent.value = contentWithMarkers;
    htmlContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
}

// Open top overlay image picker (for email templates)
function openTopOverlayImagePicker() {
  topOverlayImagePickerVisible.value = true;
}

// Insert top overlay image marker at the beginning of content
function insertTopOverlayImage(imageUrl) {
  // Store the top overlay image URL (Quill strips HTML comments, so we store separately)
  storedTopOverlayImageUrl.value = imageUrl;
  
  // Trigger content update to emit the new content with marker
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    htmlContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  topOverlayImagePickerVisible.value = false;
}

function clearTopOverlayImage() {
  storedTopOverlayImageUrl.value = null;
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    editorContent.value = contentWithMarkers;
    htmlContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
}

// Open email title dialog
function openEmailTitleDialog() {
  // Pre-fill the input with stored title value
  emailTitleInput.value = storedEmailTitle.value || '';
  emailTitleDialogVisible.value = true;
}

// Insert email title marker at the beginning of content (after header image if present)
function insertEmailTitle() {
  // Allow empty values to clear the marker
  if (!emailTitleInput.value.trim()) {
    storedEmailTitle.value = null;
  } else {
    storedEmailTitle.value = emailTitleInput.value.trim();
  }
  
  // Trigger content update to emit the new content with marker
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    htmlContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  emailTitleDialogVisible.value = false;
}

function clearEmailTitle() {
  storedEmailTitle.value = null;
  emailTitleInput.value = '';
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    editorContent.value = contentWithMarkers;
    htmlContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  emailTitleDialogVisible.value = false;
}

// Preheader functions
function openPreheaderDialog() {
  preheaderInput.value = storedPreheader.value || '';
  preheaderDialogVisible.value = true;
}

function insertPreheader() {
  // Allow empty values to clear the marker
  if (!preheaderInput.value.trim()) {
    storedPreheader.value = null;
  } else {
    storedPreheader.value = preheaderInput.value.trim();
  }
  
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  preheaderDialogVisible.value = false;
}

function clearPreheader() {
  storedPreheader.value = null;
  preheaderInput.value = '';
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  preheaderDialogVisible.value = false;
}

// Hero Subtitle functions
function openHeroSubtitleDialog() {
  heroSubtitleInput.value = storedHeroSubtitle.value || '';
  heroSubtitleDialogVisible.value = true;
}

function insertHeroSubtitle() {
  // Allow empty values to clear the marker
  if (!heroSubtitleInput.value.trim()) {
    storedHeroSubtitle.value = null;
  } else {
    storedHeroSubtitle.value = heroSubtitleInput.value.trim();
  }
  
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  heroSubtitleDialogVisible.value = false;
}

function clearHeroSubtitle() {
  storedHeroSubtitle.value = null;
  heroSubtitleInput.value = '';
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  heroSubtitleDialogVisible.value = false;
}

// Info Card functions
function toggleInfoCard() {
  // Toggle between null (auto), true (enabled), false (disabled)
  if (storedInfoCardEnabled.value === null) {
    storedInfoCardEnabled.value = true;
  } else if (storedInfoCardEnabled.value === true) {
    storedInfoCardEnabled.value = false;
  } else {
    storedInfoCardEnabled.value = null;
  }
  
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
}

function openInfoCardLabelsDialog() {
  infoCardLabelsInput.value = {
    date: storedInfoCardLabels.value.date || '',
    location: storedInfoCardLabels.value.location || '',
    time: storedInfoCardLabels.value.time || ''
  };
  infoCardLabelsDialogVisible.value = true;
}

function insertInfoCardLabels() {
  storedInfoCardLabels.value = {
    date: infoCardLabelsInput.value.date.trim() || null,
    location: infoCardLabelsInput.value.location.trim() || null,
    time: infoCardLabelsInput.value.time.trim() || null
  };
  
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  infoCardLabelsDialogVisible.value = false;
}

function clearInfoCardLabels() {
  storedInfoCardLabels.value = { date: null, location: null, time: null };
  infoCardLabelsInput.value = { date: '', location: '', time: '' };
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  infoCardLabelsDialogVisible.value = false;
}

// RSVP Code functions
function getRsvpCodeToggleTitle() {
  if (storedRsvpCodeEnabled.value === true) {
    return 'RSVP Code: Enabled (click to disable)';
  } else if (storedRsvpCodeEnabled.value === false) {
    return 'RSVP Code: Disabled (click to auto)';
  } else {
    return 'RSVP Code: Auto (click to enable)';
  }
}

function toggleRsvpCode() {
  // Store previous state for logging
  const previousState = storedRsvpCodeEnabled.value;
  
  // Toggle between null (auto), true (enabled), false (disabled)
  if (storedRsvpCodeEnabled.value === null) {
    storedRsvpCodeEnabled.value = true;
  } else if (storedRsvpCodeEnabled.value === true) {
    storedRsvpCodeEnabled.value = false;
  } else {
    storedRsvpCodeEnabled.value = null;
  }
  
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
}

// Secondary Information functions
function openSecondaryInfoDialog() {
  secondaryInfoInput.value = storedSecondaryInfo.value || '';
  secondaryInfoDialogVisible.value = true;
}

function insertSecondaryInfo() {
  if (!secondaryInfoInput.value.trim()) {
    storedSecondaryInfo.value = null;
  } else {
    storedSecondaryInfo.value = secondaryInfoInput.value.trim();
  }
  
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  secondaryInfoDialogVisible.value = false;
}

function clearSecondaryInfo() {
  storedSecondaryInfo.value = null;
  secondaryInfoInput.value = '';
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  secondaryInfoDialogVisible.value = false;
}

// Button functions
function getButtonTextPlaceholder() {
  if (buttonTypeInput.value === 'home') return 'Visit Home';
  if (buttonTypeInput.value === 'rsvp') return 'RSVP Now';
  if (buttonTypeInput.value === 'page') return 'Learn More';
  return 'Button Text';
}

async function fetchPublishedPages() {
  try {
    const response = await api.get('/admin/pages', {
      params: { status: 'published', limit: 1000 },
      meta: { showLoader: false }
    });
    
    const pages = response.data?.data || response.data || [];
    
    if (pages.length === 0) {
      availablePages.value = [];
      return;
    }
    
    // Format pages for dropdown: use slug as label (capitalize words)
    const formattedPages = pages.map((page) => {
      const label = page.slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return {
        label: label,
        value: page.slug
      };
    });
    
    availablePages.value = formattedPages;
  } catch (error) {
    availablePages.value = [];
  }
}

function openButtonDialog() {
  // Pre-fill with existing button values or defaults
  if (storedButton.value) {
    buttonTextInput.value = storedButton.value.text;
    buttonTypeInput.value = storedButton.value.type;
    buttonPageSlugInput.value = storedButton.value.type === 'page' ? storedButton.value.value : null;
  } else {
    // Set defaults
    buttonTextInput.value = '';
    buttonTypeInput.value = 'home';
    buttonPageSlugInput.value = null;
  }
  
  // Always fetch pages when dialog opens (they'll be used if type is 'page')
  // This ensures pages are available immediately when user selects 'page' type
  if (availablePages.value.length === 0) {
    fetchPublishedPages();
  }
  
  buttonDialogVisible.value = true;
}

function insertButton() {
  // Validate
  if (!buttonTextInput.value.trim()) {
    return;
  }
  
  if (buttonTypeInput.value === 'page' && !buttonPageSlugInput.value) {
    return;
  }
  
  // Store button config
  storedButton.value = {
    text: buttonTextInput.value.trim(),
    type: buttonTypeInput.value,
    value: buttonTypeInput.value === 'page' ? buttonPageSlugInput.value : ''
  };
  
  // Update content
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  buttonDialogVisible.value = false;
}

function clearButton() {
  storedButton.value = null;
  buttonTextInput.value = '';
  buttonTypeInput.value = 'home';
  buttonPageSlugInput.value = null;
  
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    const processedContent = convertButtonMarkersToHtml(currentContent);
    const contentWithMarkers = injectMarkersIntoContent(processedContent);
    
    editorContent.value = contentWithMarkers;
    emit('update:modelValue', contentWithMarkers);
  }
  
  buttonDialogVisible.value = false;
}

// Watch button type to fetch pages when changed to 'page'
watch(buttonTypeInput, (newType) => {
  if (newType === 'page' && availablePages.value.length === 0) {
    fetchPublishedPages();
  }
});

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
          // Extract markers from initial content (Quill would strip them)
          const markers = extractMarkersFromContent(props.modelValue);
          storedTopOverlayImageUrl.value = markers.topOverlayImage;
          storedPreheader.value = markers.preheader;
          storedHeroImageUrl.value = markers.heroImage;
          storedHeroSubtitle.value = markers.heroSubtitle;
          storedEmailTitle.value = markers.emailTitle;
          storedInfoCardEnabled.value = markers.infoCardEnabled;
          storedInfoCardLabels.value = markers.infoCardLabels;
          storedRsvpCodeEnabled.value = markers.rsvpCodeEnabled;
          storedSecondaryInfo.value = markers.secondaryInfo;
          storedButton.value = markers.button;
          storedToolbarState.value = markers.toolbarState || { header: null, size: null, font: null };
          
          const cleanedContent = markers.cleanedContent;
          
          // Set cleaned content to Quill (without markers)
          quill.root.innerHTML = cleanedContent || '';
          editorContent.value = props.modelValue; // Keep full content with markers
          htmlContent.value = props.modelValue;
          
          // Restore toolbar selections
          nextTick(() => {
            restoreToolbarState();
          });
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
        
        // Add event listeners to toolbar selects to save state when changed
        if (toolbarRef.value) {
          const headerSelect = toolbarRef.value.querySelector('.ql-header');
          const sizeSelect = toolbarRef.value.querySelector('.ql-size');
          const fontSelect = toolbarRef.value.querySelector('.ql-font');
          
          if (headerSelect) {
            headerSelect.addEventListener('change', saveToolbarState);
          }
          if (sizeSelect) {
            sizeSelect.addEventListener('change', saveToolbarState);
          }
          if (fontSelect) {
            fontSelect.addEventListener('change', saveToolbarState);
          }
        }
      }
    }
  });
});

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  const quillContent = editorRef.value?.quill?.root?.innerHTML || '';
  const markers = extractMarkersFromContent(newValue || '');
  const expectedQuillContent = markers.cleanedContent || '';
  const quillNeedsSync = quillContent !== expectedQuillContent;
  
  // Update if modelValue changed OR if Quill content doesn't match expected cleaned content
  if (!isInternalUpdate.value && (newValue !== editorContent.value || quillNeedsSync)) {
    isInternalUpdate.value = true;
    
    // Extract markers from new content
    const extractedMarkers = extractMarkersFromContent(newValue);
    storedTopOverlayImageUrl.value = extractedMarkers.topOverlayImage;
    storedPreheader.value = extractedMarkers.preheader;
    storedHeroImageUrl.value = extractedMarkers.heroImage;
    storedHeroSubtitle.value = extractedMarkers.heroSubtitle;
    storedEmailTitle.value = extractedMarkers.emailTitle;
    storedInfoCardEnabled.value = extractedMarkers.infoCardEnabled;
    storedInfoCardLabels.value = extractedMarkers.infoCardLabels;
    storedRsvpCodeEnabled.value = extractedMarkers.rsvpCodeEnabled;
    storedSecondaryInfo.value = extractedMarkers.secondaryInfo;
    storedToolbarState.value = extractedMarkers.toolbarState || { header: null, size: null, font: null };
    
    editorContent.value = newValue || '';
    htmlContent.value = newValue || '';
    
    nextTick(() => {
      if (editorRef.value && editorRef.value.quill) {
        const quill = editorRef.value.quill;
        // Set cleaned content (without markers) to Quill
        quill.root.innerHTML = extractedMarkers.cleanedContent || '';
        // Restore toolbar selections
        restoreToolbarState();
      }
      isInternalUpdate.value = false;
    });
  }
});

// Function to restore toolbar state from stored values
function restoreToolbarState() {
  if (!toolbarRef.value || !editorRef.value?.quill) return;
  
  const toolbar = toolbarRef.value;
  const quill = editorRef.value.quill;
  
  // Use setTimeout to ensure toolbar is fully rendered
  setTimeout(() => {
    // Restore header selection
    if (storedToolbarState.value.header) {
      const headerSelect = toolbar.querySelector('.ql-header');
      if (headerSelect) {
        headerSelect.value = storedToolbarState.value.header;
        // Trigger change event to update Quill and visual state
        const changeEvent = new Event('change', { bubbles: true });
        headerSelect.dispatchEvent(changeEvent);
      }
    }
    
    // Restore size selection
    if (storedToolbarState.value.size) {
      const sizeSelect = toolbar.querySelector('.ql-size');
      if (sizeSelect) {
        sizeSelect.value = storedToolbarState.value.size;
        const changeEvent = new Event('change', { bubbles: true });
        sizeSelect.dispatchEvent(changeEvent);
      }
    }
    
    // Restore font selection
    if (storedToolbarState.value.font) {
      const fontSelect = toolbar.querySelector('.ql-font');
      if (fontSelect) {
        fontSelect.value = storedToolbarState.value.font;
        const changeEvent = new Event('change', { bubbles: true });
        fontSelect.dispatchEvent(changeEvent);
      }
    }
  }, 100);
}

// Function to save current toolbar state
function saveToolbarState() {
  if (!toolbarRef.value) return;
  
  const toolbar = toolbarRef.value;
  
  const headerSelect = toolbar.querySelector('.ql-header');
  const sizeSelect = toolbar.querySelector('.ql-size');
  const fontSelect = toolbar.querySelector('.ql-font');
  
  storedToolbarState.value = {
    header: headerSelect?.value || null,
    size: sizeSelect?.value || null,
    font: fontSelect?.value || null
  };
  
  // Trigger content update to save toolbar state in markers
  if (editorRef.value?.quill) {
    const currentContent = editorRef.value.quill.root.innerHTML;
    handleTextChange(null, null, 'user');
  }
}
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

.ql-custom-hero-image {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  margin: 0 2px;
  border-radius: 3px;
}

.ql-custom-hero-image:hover {
  background-color: #e5e7eb;
}

.ql-custom-hero-subtitle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  margin: 0 2px;
  border-radius: 3px;
}

.ql-custom-hero-subtitle:hover {
  background-color: #e5e7eb;
}

.ql-custom-hero-subtitle i {
  display: inline-block !important;
}

.ql-custom-button i {
  display: inline-block !important;
}

.ql-custom-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  margin: 0 2px;
  border-radius: 3px;
  color: #ef4444;
}

.ql-custom-remove:hover {
  background-color: #fee2e2;
}

.ql-custom-remove i {
  display: inline-block !important;
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

.ql-custom-rsvp-code {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  margin: 0 2px;
  border-radius: 3px;
}

.ql-custom-rsvp-code:hover {
  background-color: #e5e7eb;
}

.ql-custom-rsvp-code.ql-active {
  background-color: #dbeafe;
  color: #1e40af;
}

.ql-custom-rsvp-code.ql-active:hover {
  background-color: #bfdbfe;
}

.ql-custom-rsvp-code i {
  display: inline-block !important;
}
</style>
