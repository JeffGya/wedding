<template>
  <div class="p-m-4">
    <h1 class="p-text-4xl p-font-bold p-mb-4">Survey Management</h1>
    <div class="p-mb-4">
      <Button label="New Survey" severity="primary" @click="navigateToCreate" />
    </div>

    <DataTable
      :value="surveys"
      :loading="loading"
      dataKey="id"
      stripedRows
      paginator
      :rows="10"
      class="p-mb-4"
    >
      <Column header="#" style="width: 3rem">
        <template #body="slot">{{ slot.index + 1 }}</template>
      </Column>
      <Column field="question" header="Question" />
      <Column field="type" header="Type" style="width: 6rem" />
      <Column header="Locale" style="width: 5rem">
        <template #body="slot">{{ slot.data.locale }}</template>
      </Column>
      <Column header="Required" style="width: 6rem">
        <template #body="slot">{{ slot.data.is_required ? 'Yes' : 'No' }}</template>
      </Column>
      <Column header="Anonymous" style="width: 6rem">
        <template #body="slot">{{ slot.data.is_anonymous ? 'Yes' : 'No' }}</template>
      </Column>
      <Column header="Page Slug">
        <template #body="slot">
          {{ pagesMap[slot.data.page_id] || '-' }}
        </template>
      </Column>
      <Column header="Actions" style="width: 8rem">
        <template #body="slot">
          <Button
            icon="pi pi-pencil"
            class="p-button-text p-mr-2"
            @click="navigateToEdit(slot.data)"
          />
          <Button
            icon="pi pi-trash"
            class="p-button-text p-button-danger"
            @click="deleteSurveyById(slot.data.id)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { fetchAllSurveys, deleteSurvey } from '@/api/pages';
import { fetchPages } from '@/api/pages';

const router = useRouter();
const surveys = ref([]);
const loading = ref(false);
const pagesMap = ref({});
const pageLoading = ref(false);

const fetchData = async () => {
  loading.value = true;
  surveys.value = await fetchAllSurveys();
  loading.value = false;
};

const fetchPagesMap = async () => {
  pageLoading.value = true;
  // fetchPages returns an array of page objects
  const pages = await fetchPages({ includeDeleted: false });
  pagesMap.value = pages.reduce((acc, p) => {
    acc[p.id] = p.slug;
    return acc;
  }, {});
  pageLoading.value = false;
};

onMounted(async () => {
  await fetchPagesMap();
  await fetchData();
});

const navigateToCreate = () => {
  router.push({ name: 'admin-survey-create' });
};
const navigateToEdit = (survey) => {
  router.push({ name: 'admin-survey-detail', params: { id: survey.id } });
};

const deleteSurveyById = async (id) => {
  if (!confirm('Are you sure you want to delete this survey?')) return;
  await deleteSurvey(id);
  fetchData();
};
</script>