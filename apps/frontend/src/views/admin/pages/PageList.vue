<template>
  <AdminPageWrapper 
    title="Page Management" 
    description="Create, edit, and manage your wedding website pages"
  >
    <template #headerActions>
      <Button 
        label="New Page" 
        icon="pi pi-plus" 
        severity="primary" 
        @click="navigateToCreate" 
      />
    </template>

    <Card>
      <template #content>
        <DataTable
          :value="pages"
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
          
          <Column field="slug" header="Slug" sortable>
            <template #body="slotProps">
              <span class="font-mono text-sm">{{ slotProps.data.slug }}</span>
            </template>
          </Column>
          
          <Column header="Created At" style="width: 12rem" sortable>
            <template #body="slotProps">
              {{ formatDateWithoutTime(slotProps.data.created_at) }}
            </template>
          </Column>
          
          <Column header="Updated At" style="width: 12rem" sortable>
            <template #body="slotProps">
              {{ formatDateWithoutTime(slotProps.data.updated_at) }}
            </template>
          </Column>
          
          <Column header="Status" style="width: 8rem">
            <template #body="slotProps">
              <Tag 
                :value="slotProps.data.is_published ? 'Published' : 'Draft'"
                :severity="slotProps.data.is_published ? 'success' : 'warning'"
              />
            </template>
          </Column>
          
          <Column header="RSVP Required" style="width: 8rem">
            <template #body="slotProps">
              <i 
                :class="slotProps.data.requires_rsvp ? 'i-solar:check-circle-bold text-success' : 'i-solar-close-circle-bold-duotone text-muted'"
              ></i>
            </template>
          </Column>
          
          <Column header="Show in Nav" style="width: 8rem">
            <template #body="slotProps">
              <i 
                :class="slotProps.data.show_in_nav ? 'i-solar:check-circle-bold text-success' : 'i-solar-close-circle-bold-duotone text-muted'"
              ></i>
            </template>
          </Column>
          
          <Column header="Order" sortable style="width: 6rem">
            <template #body="slotProps">
              <span v-if="slotProps.data.show_in_nav" class="font-semibold">
                {{ slotProps.data.nav_order }}
              </span>
              <span v-else class="text-muted">—</span>
            </template>
          </Column>
          
          <Column header="Actions" style="width: 10rem">
            <template #body="slotProps">
              <div class="flex gap-2">
                <ButtonGroup>
                  <Button
                    icon="i-solar:eye-bold-duotone"
                    severity="secondary"
                    size="normal"
                    @click="navigateToPreview(slotProps.data)"
                    v-tooltip.top="'Preview Page'"
                  />
                  <Button
                    icon="i-solar:pen-bold-duotone"
                    severity="contrast"
                    size="normal"
                    @click="navigateToEdit(slotProps.data)"
                    v-tooltip.top="'Edit Page'"
                  />
                  <Button
                    icon="i-solar:trash-bin-trash-bold-duotone"
                    severity="danger"
                    size="normal"
                    @click="deletePage(slotProps.data.id)"
                    v-tooltip.top="'Delete Page'"
                  />
                </ButtonGroup>
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
import { useI18n } from 'vue-i18n';
import {
  fetchPages as getPages,
  deletePage as removePage
} from '@/api/pages';
import AdminPageWrapper from '@/components/AdminPageWrapper.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import { useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { formatDateWithoutTime } from '@/utils/dateFormatter';
import { useLoading } from '@/composables/useLoading';
import { useErrorHandler } from '@/composables/useErrorHandler';

const pages = ref([]);
const { loading } = useLoading();
const { handleError } = useErrorHandler({ showToast: false }); // Silent errors for list
const confirm = useConfirm();

const fetchPages = async () => {
  loading.value = true;
  try {
    pages.value = await getPages();
  } catch (err) {
    handleError(err, 'Failed to load pages');
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
    window.open(`/${locale.value}/pages/${page.slug}`, '_blank');
  } else {
    router.push({ name: 'admin-page-preview', params: { id: page.id } });
  }
};

const deletePage = async (id) => {
  confirm.require({
    message: 'Are you sure you want to delete this page?',
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await removePage(id);
        await fetchPages();
      } catch (err) {
        handleError(err, 'Failed to delete page');
      }
    }
  });
};

onMounted(fetchPages);
</script>
