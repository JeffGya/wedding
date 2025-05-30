import 'virtual:uno.css'
import 'uno.css'
import PrimeVue from 'primevue/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Button from "primevue/button";
import ToggleSwitch from 'primevue/toggleswitch';
import Select from 'primevue/select';
import ProgressBar from 'primevue/progressbar';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
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
import Menu from 'primevue/menu';
import { useLoaderStore } from '@/store/loader';
import './style.css';

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from '@/router'
import { configure, defineRule } from 'vee-validate';
import { localize } from '@vee-validate/i18n';
import validationEn from '@vee-validate/i18n/dist/locale/en.json';
import i18n from '@/i18n';
import * as rules from '@vee-validate/rules';



// Register all built-in rules, skipping any non-function exports (e.g., the 'all' JSON object)
Object.keys(rules).forEach(name => {
  if (typeof rules[name] === 'function') {
    defineRule(name, rules[name]);
  }
});

// Configure VeeValidate
configure({
  generateMessage: localize({ en: validationEn }),  // use VeeValidate English locale
  validateOnInput: true,              // validate on each input event
});

const app = createApp(App)

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
app.component('ToggleSwitch', ToggleSwitch);
app.component('Select', Select);
app.component('ProgressBar', ProgressBar);
app.component('InputText', InputText);
app.component('Textarea', Textarea)
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
app.component('Menu', Menu);

app.mount('#app')
