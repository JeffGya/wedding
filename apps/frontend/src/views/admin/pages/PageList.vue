<template>
  <div class="p-m-4">
    <h1 class="p-text-4xl p-font-bold p-mb-4">Page Management</h1>
    <div class="p-mb-4">
      <Button label="New Page" severity="primary" @click="navigateToCreate" />
    </div>

    <DataTable
      :value="pages"
      :loading="loading"
      dataKey="id"
      stripedRows
      paginator
      :rows="10"
      class="p-mb-4"
    >
      <Column header="#" style="width: 3rem">
        <template #body="slotProps">{{ slotProps.index + 1 }}</template>
      </Column>
      <Column field="slug" header="Slug" sortable />
      <Column header="Created At" style="width: 12rem">
        <template #body="slotProps">
          {{ new Date(slotProps.data.created_at).toLocaleString() }}
        </template>
      </Column>
      <Column header="Updated At" style="width: 12rem">
        <template #body="slotProps">
          {{ new Date(slotProps.data.updated_at).toLocaleString() }}
        </template>
      </Column>
      <Column header="Published" style="width: 6rem">
        <template #body="slotProps">
          {{ slotProps.data.is_published ? 'Yes' : 'No' }}
        </template>
      </Column>
      <Column header="RSVP Required" style="width: 6rem">
        <template #body="slotProps">
          {{ slotProps.data.requires_rsvp ? 'Yes' : 'No' }}
        </template>
      </Column>
      <Column header="Show in Nav" style="width: 6rem">
        <template #body="slotProps">
          {{ slotProps.data.show_in_nav ? 'Yes' : 'No' }}
        </template>
      </Column>
      <Column header="Order" sortable style="width: 5rem">
        <template #body="slotProps">
          {{ slotProps.data.show_in_nav ? slotProps.data.nav_order : '' }}
        </template>
      </Column>
      <Column header="Actions" style="width: 8rem">
        <template #body="slotProps">
          <ButtonGroup>
            <Button
              icon="pi pi-eye"
              severity="info"
              class="p-mr-2"
              @click="navigateToPreview(slotProps.data)"
            />
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              class="p-mr-2"
              @click="navigateToEdit(slotProps.data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              @click="deletePage(slotProps.data.id)"
            />
          </ButtonGroup>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  fetchPages as getPages,
  deletePage as removePage
} from '@/api/pages';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import { useRouter } from 'vue-router';

const pages = ref([]);
const loading = ref(false);

const fetchPages = async () => {
  loading.value = true;
  try {
    pages.value = await getPages();
  } catch (err) {
    console.error('Failed to load pages', err);
  } finally {
    loading.value = false;
  }
};

const router = useRouter();
const { locale } = useI18n();

const navigateToCreate = () => {
  router.push({ name: 'admin-page-create' });
};

const navigateToEdit = (page) => {
  router.push({ name: 'admin-page-edit', params: { id: page.id } });
};

const navigateToPreview = (page) => {
  if (page.is_published) {
    // Open the public page in a new tab
    window.open(`/${locale.value}/pages/${page.slug}`, '_blank');
  } else {
    // Navigate to admin preview route for unpublished page
    router.push({ name: 'admin-page-preview', params: { id: page.id } });
  }
};

const deletePage = async (id) => {
  if (!confirm('Are you sure you want to delete this page?')) return;
  try {
    await removePage(id);
    fetchPages();
  } catch (err) {
    console.error('Failed to delete page', err);
  }
};

onMounted(fetchPages);
</script>
