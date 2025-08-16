<template>
  <AdminPageWrapper 
    title="Survey Management" 
    description="Create and manage surveys for collecting guest information and feedback"
  >
    <template #headerActions>
      <Button 
        label="New Survey" 
        icon="pi pi-plus" 
        severity="primary" 
        @click="navigateToCreate" 
      />
    </template>

    <Card>
      <template #content>
        <DataTable
          :value="surveys"
          :loading="loading"
          dataKey="id"
          stripedRows
          paginator
          :rows="10"
          :rowsPerPageOptions="[10, 20, 50]"
          responsiveLayout="scroll"
          class="w-full"
        >
          <Column header="#" style="width: 3rem">
            <template #body="slotProps">{{ slotProps.index + 1 }}</template>
          </Column>
          
          <Column field="question" header="Question" />
          
          <Column field="type" header="Type" style="width: 8rem">
            <template #body="slotProps">
              <Tag 
                :value="slotProps.data.type"
                :severity="getTypeSeverity(slotProps.data.type)"
              />
            </template>
          </Column>
          
          <Column header="Locale" style="width: 6rem">
            <template #body="slotProps">
              <Tag 
                :value="slotProps.data.locale.toUpperCase()"
                severity="info"
              />
            </template>
          </Column>
          
          <Column header="Required" style="width: 8rem">
            <template #body="slotProps">
              <i 
                :class="slotProps.data.is_required ? 'pi pi-check text-success' : 'pi pi-times text-muted'"
              ></i>
            </template>
          </Column>
          
          <Column header="Anonymous" style="width: 8rem">
            <template #body="slotProps">
              <i 
                :class="slotProps.data.is_anonymous ? 'pi pi-check text-success' : 'pi pi-times text-muted'"
              ></i>
            </template>
          </Column>
          
          <Column header="Page Slug" style="width: 10rem">
            <template #body="slotProps">
              <span class="font-mono text-sm">{{ pagesMap[slotProps.data.page_id] || '—' }}</span>
            </template>
          </Column>
          
          <Column header="Actions" style="width: 10rem">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  size="normal"
                  @click="navigateToEdit(slotProps.data)"
                  v-tooltip.top="'Edit Survey'"
                />
                <Button
                  icon="i-solar:trash-bin-trash-bold-duotone"
                  severity="danger"
                  size="normal"
                  @click="deleteSurveyById(slotProps.data.id)"
                  v-tooltip.top="'Delete Survey'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AdminPageWrapper from '@/components/AdminPageWrapper.vue';
import Tag from 'primevue/tag';
import { fetchAllSurveys, deleteSurvey } from '@/api/pages';
import { fetchPages } from '@/api/pages';

const router = useRouter();
const surveys = ref([]);
const loading = ref(false);
const pagesMap = ref({});
const pageLoading = ref(false);

const getTypeSeverity = (type) => {
  switch (type) {
    case 'text': return 'info';
    case 'select': return 'warning';
    case 'radio': return 'success';
    case 'checkbox': return 'secondary';
    default: return 'info';
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    surveys.value = await fetchAllSurveys();
  } catch (err) {
    console.error('Failed to load surveys', err);
  } finally {
    loading.value = false;
  }
};

const fetchPagesMap = async () => {
  pageLoading.value = true;
  try {
    const pages = await fetchPages({ includeDeleted: false });
    pagesMap.value = pages.reduce((acc, p) => {
      acc[p.id] = p.slug;
      return acc;
    }, {});
  } catch (err) {
    console.error('Failed to load pages', err);
  } finally {
    pageLoading.value = false;
  }
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
  try {
    await deleteSurvey(id);
    await fetchData();
  } catch (err) {
    console.error('Failed to delete survey', err);
  }
};
</script>