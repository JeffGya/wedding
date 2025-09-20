import './loggingGuard'
import 'virtual:uno.css'
import 'uno.css'
// Quill CSS for editor content rendering
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import PrimeVue from 'primevue/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Button from "primevue/button";
import ButtonGroup from 'primevue/buttongroup';
import ToggleSwitch from 'primevue/toggleswitch';
import Select from 'primevue/select';
import ProgressBar from 'primevue/progressbar';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Password from 'primevue/password';
import RadioButton from 'primevue/radiobutton';
import RadioButtonGroup from 'primevue/radiobuttongroup';
import FloatLabel from 'primevue/floatlabel';
import Message from 'primevue/message';
import Card from 'primevue/card';
import ToastService from 'primevue/toastservice';
import Alert from 'primevue/toast';
import { Form, FormField } from '@primevue/forms';
import DatePicker from 'primevue/datepicker';
import Editor from 'primevue/editor';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Chart from 'primevue/chart';
import Dialog from 'primevue/dialog';
import FileUpload from 'primevue/fileupload';
import Panel from 'primevue/panel';
import Fieldset from 'primevue/fieldset';
import ConfirmPopup from 'primevue/confirmpopup';
import ConfirmDialog from 'primevue/confirmdialog';
import ConfirmationService from 'primevue/confirmationservice';
import Menu from 'primevue/menu';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Divider from 'primevue/divider';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import Tooltip from 'primevue/tooltip';
import Timeline from 'primevue/timeline';
import Calendar from 'primevue/calendar';
import SelectButton from 'primevue/selectbutton';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';

import RichTextEditor from '@/components/forms/RichTextEditor.vue';
import ImagePicker from '@/components/ui/ImagePicker.vue';
import EmbedEditor from '@/components/EmbedEditor.vue';
import SurveySelector from '@/components/SurveySelector.vue';
import AdminPageWrapper from '@/components/AdminPageWrapper.vue';
import { useLoaderStore } from '@/store/loader';
import './style.css';

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@vueuse/head'
import App from './App.vue'
import router from '@/router'
import { configure, defineRule } from 'vee-validate';
import { localize } from '@vee-validate/i18n';
import i18n from '@/i18n';
import * as rules from '@vee-validate/rules';

// Silence console logs in production unless explicitly enabled
if (import.meta.env.PROD && !import.meta.env.VITE_ENABLE_LOGS) {
  ['log','debug','info','table'].forEach(m => (console[m] = () => {}));
}

// Register all built-in rules, skipping any non-function exports (e.g., the 'all' JSON object)
Object.keys(rules).forEach(name => {
  if (typeof rules[name] === 'function') {
    defineRule(name, rules[name]);
  }
});

// Configure VeeValidate without i18n
configure({
  // generateMessage: localize({ en: validationEn }),  // Comment this out
  validateOnInput: true,
});

const app = createApp(App)
const head = createHead()

const MyPreset = definePreset(Aura, {
  components: {
    ToggleSwitch: {
      width: '4rem',

      handle : {
        width: '2rem',
        height: '2rem',
        borderRadius: '50%',
        backgroundColor: '#fff',
        boxShadow: '0 0 0.5rem rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease-in-out',
      },
    }
  },
});

app.use(createPinia())
app.use(ToastService)
app.use(i18n)
app.use(head)
app.use(router)

// Global loader for route navigation
const loader = useLoaderStore();
router.beforeEach((to, from) => {
  loader.start();
});
router.afterEach((to, from) => {
  loader.finish();
});
router.onError((error) => {
  loader.finish();
});

app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: MyPreset,
    options: {
      darkModeSelector: '.dark-mode',
    }
  }
});
app.component('Button', Button);
app.component('ButtonGroup', ButtonGroup);
app.component('ToggleSwitch', ToggleSwitch);
app.component('Select', Select);
app.component('ProgressBar', ProgressBar);
app.component('InputText', InputText);
app.component('Textarea', Textarea);
app.component('Password', Password);
app.component('FloatLabel', FloatLabel);
app.component('Message', Message);
app.component('Card', Card);
app.component('Alert', Alert);
app.component('Form', Form);
app.component('FormField', FormField);
app.component('RadioButton', RadioButton);
app.component('RadioButtonGroup', RadioButtonGroup);
app.component('DatePicker', DatePicker);
app.component('Editor', Editor);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('Chart', Chart);
app.component('Dialog', Dialog);
app.component('FileUpload', FileUpload);
app.component('Panel', Panel);
app.component('Fieldset', Fieldset);
app.component('ConfirmPopup', ConfirmPopup);
app.component('ConfirmDialog', ConfirmDialog);
app.component('Menu', Menu);
app.component('Tabs', Tabs);
app.component('TabList', TabList);
app.component('Tab', Tab);
app.component('TabPanels', TabPanels);
app.component('TabPanel', TabPanel);
app.component('Divider', Divider);
app.component('Checkbox', Checkbox);
app.component('InputNumber', InputNumber);
app.component('Skeleton', Skeleton);
app.component('Tag', Tag);
app.component('Timeline', Timeline);
app.component('Calendar', Calendar);
app.component('SelectButton', SelectButton);
app.component('ProgressSpinner', ProgressSpinner);
app.component('Toast', Toast);
app.directive('tooltip', Tooltip);

app.component('RichTextEditor', RichTextEditor);
app.component('ImagePicker', ImagePicker);
app.component('EmbedEditor', EmbedEditor);
app.component('SurveySelector', SurveySelector);
app.component('AdminPageWrapper', AdminPageWrapper);
app.use(ConfirmationService);

app.mount('#app')
