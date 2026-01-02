<template>
  <Dialog
    :visible="isVisible"
    @update:visible="updateVisible"
    modal
    :style="{ width: '80vw', height: '80vh' }"
    :closable="true"
    :draggable="false"
    class="test-email-modal"
    @hide="handleClose"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="text-2xl font-semibold">Test Email Configuration</h2>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Step {{ currentStep }} of {{ totalSteps }}</span>
        </div>
      </div>
    </template>

    <div class="test-email-content h-full flex flex-col">
      <!-- Progress Indicator -->
      <div class="mb-6">
        <ProgressBar :value="progressPercentage" :showValue="false" />
        <div class="flex justify-between mt-2 text-sm text-gray-600">
          <span :class="{ 'font-semibold': currentStep === 1 }">Guest Info</span>
          <span :class="{ 'font-semibold': currentStep === 2 }">RSVP</span>
          <span :class="{ 'font-semibold': currentStep === 3 }">Template</span>
          <span :class="{ 'font-semibold': currentStep === 4 }">Options</span>
          <span :class="{ 'font-semibold': currentStep === 5 }">Summary</span>
        </div>
      </div>

      <!-- Step Content (Scrollable) -->
      <div class="flex-1 overflow-y-auto">
        <!-- Step 1: Guest Creation -->
        <div v-if="currentStep === 1" class="space-y-6">
          <Card>
            <template #title>Guest Information</template>
            <template #content>
              <Form ref="guestFormRef" :model="guestForm" @submit="handleGuestSubmit" class="space-y-4">
                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="group_label"
                      v-model="guestForm.group_label"
                      type="text"
                      class="w-full"
                      rules="required|regex:/^[\\p{L}&']+$/u"
                    />
                    <label for="group_label">Group Name</label>
                  </FloatLabel>
                </div>

                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="name"
                      v-model="guestForm.name"
                      type="text"
                      class="w-full"
                      rules="required|regex:/^[\\p{L}&']+$/u"
                    />
                    <label for="name">Name</label>
                  </FloatLabel>
                </div>

                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="email"
                      v-model="guestForm.email"
                      type="email"
                      class="w-full"
                    />
                    <label for="email">Email (Recipient)</label>
                  </FloatLabel>
                </div>

                <div>
                  <FloatLabel variant="in">
                    <Select
                      id="preferred_language"
                      v-model="guestForm.preferred_language"
                      :options="[
                        { label: 'English', value: 'en' },
                        { label: 'Lithuanian', value: 'lt' }
                      ]"
                      optionLabel="label"
                      optionValue="value"
                      class="w-full"
                    />
                    <label for="preferred_language">Preferred Language</label>
                  </FloatLabel>
                </div>

                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="code"
                      v-model="guestForm.code"
                      type="text"
                      class="w-full"
                    />
                    <label for="code">Code (Auto-generated if left blank)</label>
                  </FloatLabel>
                </div>

                <div class="flex items-center">
                  <ToggleSwitch
                    id="plusOneSwitch"
                    v-model="guestForm.can_bring_plus_one"
                  />
                  <label for="plusOneSwitch" class="ml-2 font-medium">Allow Plus One</label>
                </div>

                <div class="flex items-center">
                  <ToggleSwitch
                    id="primarySwitch"
                    v-model="guestForm.is_primary"
                  />
                  <label for="primarySwitch" class="ml-2 font-medium">Primary Guest</label>
                </div>
              </Form>
            </template>
          </Card>
        </div>

        <!-- Step 2: RSVP Form -->
        <div v-if="currentStep === 2" class="space-y-6">
          <Card>
            <template #title>RSVP Information</template>
            <template #subtitle>Fill in RSVP details to test email templates with RSVP data</template>
            <template #content>
              <div class="space-y-6">
                <!-- Attending Status -->
                <div class="space-y-3">
                  <label class="block text-sm font-medium">Will you be attending?</label>
                  <div class="flex gap-4">
                    <div class="flex items-center gap-2">
                      <RadioButton 
                        v-model="rsvpForm.attending" 
                        inputId="attending-yes" 
                        name="attending" 
                        :value="true"
                      />
                      <label for="attending-yes">Yes, I'll be there!</label>
                    </div>
                    <div class="flex items-center gap-2">
                      <RadioButton 
                        v-model="rsvpForm.attending" 
                        inputId="attending-no" 
                        name="attending" 
                        :value="false"
                      />
                      <label for="attending-no">Sorry, can't make it</label>
                    </div>
                  </div>
                </div>

                <!-- Dietary Requirements (shown if attending) -->
                <div v-if="rsvpForm.attending" class="space-y-3">
                  <FloatLabel variant="in">
                    <InputText
                      id="dietary"
                      v-model="rsvpForm.dietary"
                      type="text"
                      class="w-full"
                    />
                    <label for="dietary">Dietary Requirements</label>
                  </FloatLabel>
                </div>

                <!-- Notes (shown if attending) -->
                <div v-if="rsvpForm.attending" class="space-y-3">
                  <FloatLabel variant="in">
                    <Textarea
                      id="notes"
                      v-model="rsvpForm.notes"
                      class="w-full"
                      rows="3"
                    />
                    <label for="notes">Additional Notes</label>
                  </FloatLabel>
                </div>

                <!-- Plus One Section (shown if can_bring_plus_one and attending) -->
                <div v-if="rsvpForm.attending && guestForm.can_bring_plus_one" class="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <ToggleSwitch
                      id="addPlusOne"
                      v-model="rsvpForm.add_plus_one"
                    />
                    <label for="addPlusOne" class="font-medium">Bringing a plus one?</label>
                  </div>

                  <div v-if="rsvpForm.add_plus_one" class="space-y-4 mt-4">
                    <FloatLabel variant="in">
                      <InputText
                        id="plus_one_name"
                        v-model="rsvpForm.plus_one_name"
                        type="text"
                        class="w-full"
                      />
                      <label for="plus_one_name">Plus One's Name</label>
                    </FloatLabel>

                    <FloatLabel variant="in">
                      <InputText
                        id="plus_one_dietary"
                        v-model="rsvpForm.plus_one_dietary"
                        type="text"
                        class="w-full"
                      />
                      <label for="plus_one_dietary">Plus One's Dietary Requirements</label>
                    </FloatLabel>
                  </div>
                </div>

                <!-- Send RSVP Confirmation Email Option -->
                <div v-if="rsvpForm.attending !== null" class="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <ToggleSwitch
                      id="sendRsvpConfirmation"
                      v-model="rsvpForm.send_confirmation"
                    />
                    <label for="sendRsvpConfirmation" class="font-medium">
                      Also send RSVP confirmation email
                    </label>
                  </div>
                  <p class="text-sm text-blue-700 mt-2">
                    This will send a "{{ rsvpForm.attending ? 'Thank You - Attending' : 'Thank You - Not Attending' }}" email after the main test email
                  </p>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Step 3: Template Selection -->
        <div v-if="currentStep === 3" class="space-y-6">
          <Card>
            <template #title>Select Template</template>
            <template #content>
              <div class="space-y-4">
                <div>
                  <FloatLabel variant="in">
                    <Select
                      id="template"
                      v-model="selectedTemplateId"
                      :options="templates"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Select a template"
                      class="w-full"
                      :loading="loadingTemplates"
                    />
                    <label for="template">Email Template</label>
                  </FloatLabel>
                  <p v-if="selectedTemplate" class="text-sm text-gray-600 mt-2">
                    {{ selectedTemplate.description || 'No description available' }}
                  </p>
                </div>

                <div>
                  <FloatLabel variant="in">
                    <Select
                      id="templateStyle"
                      v-model="selectedTemplateStyle"
                      :options="templateStyleOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select email style"
                      class="w-full"
                    />
                    <label for="templateStyle">Email Style</label>
                  </FloatLabel>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-2">Test Language</label>
                  <SelectButton
                    v-model="testLanguage"
                    :options="languageOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  />
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Step 4: Email Options -->
        <div v-if="currentStep === 4" class="space-y-6">
          <Card>
            <template #title>Email Options</template>
            <template #content>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Send Mode</label>
                  <SelectButton
                    v-model="sendMode"
                    :options="sendModeOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  />
                </div>

                <div v-if="sendMode === 'scheduled'" class="p-4 bg-blue-50 rounded-lg">
                  <p class="text-sm text-blue-800">
                    <strong>Scheduled Time:</strong> {{ formattedScheduledTime }}
                  </p>
                  <p class="text-xs text-blue-600 mt-1">
                    Email will be scheduled to send 5 minutes from now
                  </p>
                </div>

                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="recipientEmail"
                      v-model="recipientEmail"
                      type="email"
                      :placeholder="guestForm.email || 'test@example.com'"
                      class="w-full"
                    />
                    <label for="recipientEmail">Recipient Email Address</label>
                  </FloatLabel>
                  <p class="text-sm text-gray-600 mt-1">
                    Where to send the test email (defaults to guest email)
                  </p>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Step 5: Summary View -->
        <div v-if="currentStep === 5" class="space-y-6">
          <!-- Quick Status Bar -->
          <div v-if="!loadingHealthCheck && healthCheck" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div class="flex items-center gap-2">
                <i class="i-solar-check-circle-bold text-green-600 text-xl"></i>
                <span class="text-2xl font-bold text-green-700">{{ healthCheckSummary?.passed || 0 }}</span>
              </div>
              <p class="text-sm text-green-600 mt-1">Checks Passed</p>
            </div>
            <div class="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <div class="flex items-center gap-2">
                <i class="i-solar-close-circle-bold text-red-600 text-xl"></i>
                <span class="text-2xl font-bold text-red-700">{{ healthCheckSummary?.failed || 0 }}</span>
              </div>
              <p class="text-sm text-red-600 mt-1">Errors</p>
            </div>
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div class="flex items-center gap-2">
                <i class="i-solar-code-bold text-blue-600 text-xl"></i>
                <span class="text-2xl font-bold text-blue-700">{{ healthCheck.templateVariables?.used || 0 }}</span>
              </div>
              <p class="text-sm text-blue-600 mt-1">Variables Used</p>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div class="flex items-center gap-2">
                <i class="i-solar-letter-bold text-purple-600 text-xl"></i>
                <span class="text-2xl font-bold text-purple-700">{{ healthCheck.emailProvider?.messageId ? '1' : '0' }}</span>
              </div>
              <p class="text-sm text-purple-600 mt-1">Email Sent</p>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loadingHealthCheck" class="text-center py-12">
            <ProgressSpinner />
            <p class="mt-4 text-gray-600">Running health checks and generating preview...</p>
          </div>

          <!-- Health Check Status Section (Collapsible) -->
          <Accordion v-if="!loadingHealthCheck && healthCheck" :multiple="true">
            <AccordionTab>
              <template #header>
                <div class="flex items-center gap-3">
                  <i :class="healthCheckSummary?.failed === 0 ? 'i-solar-shield-check-bold text-green-500' : 'i-solar-shield-warning-bold text-red-500'" class="text-xl"></i>
                  <span class="font-semibold">Health Check Details</span>
                  <Badge
                    :value="healthCheckSummary?.failed === 0 ? 'All Passed' : `${healthCheckSummary?.failed} Issues`"
                    :severity="healthCheckSummary?.failed === 0 ? 'success' : 'danger'"
                    class="ml-2"
                  />
                </div>
              </template>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                <!-- Email Provider -->
                <div :class="['p-4 rounded-lg border', healthCheck.emailProvider?.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200']" class="md:col-span-2">
                  <div class="flex items-center gap-2 mb-2">
                    <i :class="healthCheck.emailProvider?.connected ? 'i-solar-check-circle-bold text-green-600' : 'i-solar-close-circle-bold text-red-600'"></i>
                    <span class="font-medium">Email Provider (Resend)</span>
                    <span v-if="healthCheck.emailProvider?.responseTime" class="text-xs text-gray-500 ml-auto">
                      {{ healthCheck.emailProvider.responseTime }}ms
                    </span>
                  </div>
                  
                  <!-- Success State -->
                  <div v-if="healthCheck.emailProvider?.connected">
                    <p class="text-sm text-green-700">{{ healthCheck.emailProvider.message || 'Connected & Ready' }}</p>
                    <p v-if="healthCheck.emailProvider?.messageId" class="text-xs text-gray-500 mt-1 font-mono">
                      Message ID: {{ healthCheck.emailProvider.messageId }}
                    </p>
                    <!-- Show verified domains -->
                    <div v-if="healthCheck.emailProvider?.domains?.length" class="mt-2">
                      <p class="text-xs text-gray-600 font-medium">Verified Domains:</p>
                      <div class="flex flex-wrap gap-1 mt-1">
                        <span 
                          v-for="domain in healthCheck.emailProvider.domains" 
                          :key="domain.name"
                          :class="['text-xs px-2 py-0.5 rounded', domain.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700']"
                        >
                          {{ domain.name }} ({{ domain.status }})
                        </span>
                      </div>
                    </div>
                    <!-- Warning if no verified domains -->
                    <div v-if="healthCheck.emailProvider?.warning" class="mt-2 p-2 bg-yellow-100 rounded border border-yellow-300">
                      <p class="text-xs text-yellow-800 font-medium">⚠️ {{ healthCheck.emailProvider.warning.message }}</p>
                      <p class="text-xs text-yellow-700 mt-1">{{ healthCheck.emailProvider.warning.fixSuggestion }}</p>
                    </div>
                  </div>
                  
                  <!-- Error State -->
                  <div v-else-if="healthCheck.emailProvider?.error" class="space-y-2">
                    <div class="p-3 bg-red-100 rounded border border-red-300">
                      <p class="text-sm text-red-800 font-semibold flex items-center gap-2">
                        <i class="i-solar-danger-triangle-bold"></i>
                        {{ healthCheck.emailProvider.error.type?.replace(/_/g, ' ').toUpperCase() }}
                      </p>
                      <p class="text-sm text-red-700 mt-1">{{ healthCheck.emailProvider.error.message }}</p>
                      
                      <!-- Error Details -->
                      <div v-if="healthCheck.emailProvider.error.details" class="mt-2 text-xs text-red-600">
                        <p v-if="healthCheck.emailProvider.error.code">Error Code: <code class="bg-red-200 px-1 rounded">{{ healthCheck.emailProvider.error.code }}</code></p>
                        <p v-if="healthCheck.emailProvider.error.details.apiKeyPrefix">API Key: <code class="bg-red-200 px-1 rounded font-mono">{{ healthCheck.emailProvider.error.details.apiKeyPrefix }}</code></p>
                        <p v-if="healthCheck.emailProvider.error.details.statusCode">HTTP Status: {{ healthCheck.emailProvider.error.details.statusCode }}</p>
                      </div>
                      
                      <!-- Fix Suggestion -->
                      <div class="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                        <p class="text-xs text-blue-800 font-medium">💡 How to fix:</p>
                        <p class="text-xs text-blue-700">{{ healthCheck.emailProvider.error.fixSuggestion }}</p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Unknown State -->
                  <p v-else class="text-sm text-red-700">Disconnected - Unknown error</p>
                </div>

                <!-- Database -->
                <div :class="['p-4 rounded-lg border', healthCheck.database?.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200']">
                  <div class="flex items-center gap-2 mb-2">
                    <i :class="healthCheck.database?.connected ? 'i-solar-check-circle-bold text-green-600' : 'i-solar-close-circle-bold text-red-600'"></i>
                    <span class="font-medium">Database</span>
                  </div>
                  <p class="text-sm" :class="healthCheck.database?.connected ? 'text-green-700' : 'text-red-700'">
                    {{ healthCheck.database?.connected ? 'Connected' : 'Disconnected' }}
                  </p>
                  <p v-if="healthCheck.database?.queryTime" class="text-xs text-gray-500 mt-1">
                    Response: {{ healthCheck.database.queryTime }}ms
                  </p>
                  <!-- Database Error Details -->
                  <div v-if="healthCheck.database?.error" class="mt-2 p-2 bg-red-100 rounded border border-red-300">
                    <p class="text-xs text-red-700">{{ healthCheck.database.error.message }}</p>
                    <p v-if="healthCheck.database.error.fixSuggestion" class="text-xs text-blue-700 mt-1">💡 {{ healthCheck.database.error.fixSuggestion }}</p>
                  </div>
                </div>

                <!-- Settings -->
                <div :class="['p-4 rounded-lg border', healthCheck.settings?.complete ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200']">
                  <div class="flex items-center gap-2 mb-2">
                    <i :class="healthCheck.settings?.complete ? 'i-solar-check-circle-bold text-green-600' : 'i-solar-danger-circle-bold text-yellow-600'"></i>
                    <span class="font-medium">Settings</span>
                  </div>
                  <p class="text-sm" :class="healthCheck.settings?.complete ? 'text-green-700' : 'text-yellow-700'">
                    {{ healthCheck.settings?.complete ? 'Complete' : `${healthCheck.settings?.missing?.length || 0} missing` }}
                  </p>
                  <!-- Missing Settings -->
                  <div v-if="healthCheck.settings?.missing?.length" class="mt-2">
                    <p class="text-xs text-yellow-700">Missing: {{ healthCheck.settings.missing.join(', ') }}</p>
                  </div>
                </div>

                <!-- Environment -->
                <div :class="['p-4 rounded-lg border', healthCheck.environmentVariables?.complete ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200']">
                  <div class="flex items-center gap-2 mb-2">
                    <i :class="healthCheck.environmentVariables?.complete ? 'i-solar-check-circle-bold text-green-600' : 'i-solar-danger-circle-bold text-yellow-600'"></i>
                    <span class="font-medium">Environment</span>
                  </div>
                  <p class="text-sm" :class="healthCheck.environmentVariables?.complete ? 'text-green-700' : 'text-yellow-700'">
                    {{ healthCheck.environmentVariables?.complete ? 'All Set' : `${healthCheck.environmentVariables?.missing?.length || 0} missing` }}
                  </p>
                  <!-- Missing Env Vars -->
                  <div v-if="healthCheck.environmentVariables?.missing?.length" class="mt-2">
                    <p class="text-xs text-yellow-700">Missing: {{ healthCheck.environmentVariables.missing.join(', ') }}</p>
                  </div>
                </div>
              </div>
            </AccordionTab>
          </Accordion>

          <!-- Split View: Variables and Email Preview -->
          <div v-if="!loadingHealthCheck" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left: Variable Values (Improved) -->
            <Card class="h-fit">
              <template #title>
                <div class="flex items-center justify-between">
                  <span>Template Variables</span>
                  <span class="text-sm font-normal text-gray-500">{{ Object.keys(variables || {}).length }} total</span>
                </div>
              </template>
              <template #content>
                <!-- Variable Search -->
                <div class="mb-4">
                  <FloatLabel variant="in">
                    <InputText
                      id="variableSearch"
                      v-model="variableSearch"
                      class="w-full"
                    />
                    <label for="variableSearch">Search variables...</label>
                  </FloatLabel>
                </div>

                <!-- Categorized Variables -->
                <div v-if="variables" class="space-y-4 max-h-80 overflow-y-auto pr-2">
                  <!-- Guest Variables -->
                  <div v-if="filteredGuestVariables.length > 0">
                    <div class="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1">
                      <i class="i-solar-user-bold text-blue-500"></i>
                      <span class="text-sm font-semibold text-blue-700">Guest Info</span>
                    </div>
                    <div class="space-y-1">
                      <div 
                        v-for="[key, value] in filteredGuestVariables" 
                        :key="key"
                        class="flex items-start gap-2 p-2 rounded hover:bg-gray-50 group"
                      >
                        <code class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono whitespace-nowrap">{{ key }}</code>
                        <span class="text-sm flex-1 break-all" :class="getValueClass(value)">{{ formatVariableValue(value) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- RSVP Variables -->
                  <div v-if="filteredRsvpVariables.length > 0">
                    <div class="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1">
                      <i class="i-solar-calendar-mark-bold text-green-500"></i>
                      <span class="text-sm font-semibold text-green-700">RSVP Status</span>
                    </div>
                    <div class="space-y-1">
                      <div 
                        v-for="[key, value] in filteredRsvpVariables" 
                        :key="key"
                        class="flex items-start gap-2 p-2 rounded hover:bg-gray-50 group"
                      >
                        <code class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-mono whitespace-nowrap">{{ key }}</code>
                        <span class="text-sm flex-1 break-all" :class="getValueClass(value)">{{ formatVariableValue(value) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Event Variables -->
                  <div v-if="filteredEventVariables.length > 0">
                    <div class="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1">
                      <i class="i-solar-calendar-bold text-purple-500"></i>
                      <span class="text-sm font-semibold text-purple-700">Event Details</span>
                    </div>
                    <div class="space-y-1">
                      <div 
                        v-for="[key, value] in filteredEventVariables" 
                        :key="key"
                        class="flex items-start gap-2 p-2 rounded hover:bg-gray-50 group"
                      >
                        <code class="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono whitespace-nowrap">{{ key }}</code>
                        <span class="text-sm flex-1 break-all" :class="getValueClass(value)">{{ formatVariableValue(value) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- System Variables -->
                  <div v-if="filteredSystemVariables.length > 0">
                    <div class="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1">
                      <i class="i-solar-settings-bold text-gray-500"></i>
                      <span class="text-sm font-semibold text-gray-700">System</span>
                    </div>
                    <div class="space-y-1">
                      <div 
                        v-for="[key, value] in filteredSystemVariables" 
                        :key="key"
                        class="flex items-start gap-2 p-2 rounded hover:bg-gray-50 group"
                      >
                        <code class="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-mono whitespace-nowrap">{{ key }}</code>
                        <span class="text-sm flex-1 break-all" :class="getValueClass(value)">{{ formatVariableValue(value) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Right: Email Preview -->
            <Card>
              <template #title>
                <div class="flex items-center justify-between">
                  <span>Email Preview</span>
                  <SelectButton
                    v-if="emailHtmlEn && emailHtmlLt"
                    v-model="previewLanguage"
                    :options="previewLanguageOptions"
                    optionLabel="label"
                    optionValue="value"
                    size="small"
                  />
                </div>
              </template>
              <template #content>
                <div class="border rounded-lg overflow-hidden bg-white shadow-inner">
                  <div class="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                    <div class="flex gap-1.5">
                      <span class="w-3 h-3 rounded-full bg-red-400"></span>
                      <span class="w-3 h-3 rounded-full bg-yellow-400"></span>
                      <span class="w-3 h-3 rounded-full bg-green-400"></span>
                    </div>
                    <span class="text-xs text-gray-500 ml-2">Email Preview</span>
                  </div>
                  <div class="max-h-96 overflow-y-auto p-4 bg-gray-50">
                    <div v-html="currentPreviewHtml" class="email-preview-content"></div>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex justify-between mt-6 pt-4 border-t">
        <Button
          label="Cancel"
          severity="secondary"
          @click="handleClose"
          :disabled="sending"
        />
        <div class="flex gap-2">
          <Button
            v-if="currentStep > 1"
            label="Back"
            severity="secondary"
            @click="previousStep"
            :disabled="sending"
          />
          <Button
            v-if="currentStep < totalSteps"
            label="Next"
            severity="primary"
            @click="nextStep"
            :disabled="!canProceed || sending"
          />
          <Button
            v-if="currentStep === totalSteps"
            :label="sendMode === 'scheduled' ? 'Schedule Test Email' : 'Send Test Email'"
            severity="primary"
            icon="pi pi-send"
            @click="sendTestEmail"
            :loading="sending"
            :disabled="!canSend"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import Dialog from 'primevue/dialog'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'
import ProgressBar from 'primevue/progressbar'
import ProgressSpinner from 'primevue/progressspinner'
import Panel from 'primevue/panel'
import Badge from 'primevue/badge'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import ToggleSwitch from 'primevue/toggleswitch'
import RadioButton from 'primevue/radiobutton'
import Textarea from 'primevue/textarea'
import { Form } from '@primevue/forms'
import { fetchTemplates } from '@/api/templates'
import { sendTestEmail as sendTestEmailApi } from '@/api/settings'
import { useToastService } from '@/utils/toastService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

const { showSuccess, showError } = useToastService()

// Computed property for two-way binding with parent
const isVisible = computed(() => props.visible)

function updateVisible(value) {
  emit('update:visible', value)
}

// Step management
const currentStep = ref(1)
const totalSteps = 5
const progressPercentage = computed(() => (currentStep.value / totalSteps) * 100)

// Guest form data
const guestFormRef = ref(null)
const guestForm = reactive({
  group_label: '',
  name: '',
  email: '',
  code: '',
  can_bring_plus_one: false,
  is_primary: true,
  preferred_language: 'en'
})

// RSVP form data
const rsvpForm = reactive({
  attending: null,
  dietary: '',
  notes: '',
  add_plus_one: false,
  plus_one_name: '',
  plus_one_dietary: '',
  send_confirmation: false
})

// Guest data (after form submission)
const guestData = ref(null)
const rsvpData = ref(null)
const testGuestObject = computed(() => {
  if (!guestData.value) return null
  return {
    ...guestData.value,
    id: 999999, // Temporary ID for test
    attending: rsvpForm.attending,
    dietary: rsvpForm.dietary || null,
    notes: rsvpForm.notes || null,
    plus_one_name: rsvpForm.add_plus_one ? rsvpForm.plus_one_name : null,
    plus_one_dietary: rsvpForm.add_plus_one ? rsvpForm.plus_one_dietary : null,
    rsvp_status: rsvpForm.attending === true ? 'attending' : rsvpForm.attending === false ? 'not_attending' : 'pending'
  }
})

// Template selection
const templates = ref([])
const selectedTemplateId = ref(null)
const selectedTemplate = computed(() => templates.value.find(t => t.id === selectedTemplateId.value))
const selectedTemplateStyle = ref('elegant')
const templateStyleOptions = [
  { label: 'Elegant', value: 'elegant' },
  { label: 'Modern', value: 'modern' },
  { label: 'Friendly', value: 'friendly' }
]
const testLanguage = ref('en')
const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Lithuanian', value: 'lt' },
  { label: 'Both', value: 'both' }
]
const loadingTemplates = ref(false)

// Email options
const sendMode = ref('immediate')
const sendModeOptions = [
  { label: 'Send Immediately', value: 'immediate' },
  { label: 'Schedule (5 min ahead)', value: 'scheduled' }
]
const recipientEmail = ref('')
const formattedScheduledTime = computed(() => {
  if (sendMode.value === 'scheduled') {
    const now = new Date()
    const scheduledTime = new Date(now.getTime() + 5 * 60 * 1000) // Add 5 minutes
    // Format as YYYY-MM-DD HH:mm:ss in Europe/Amsterdam timezone
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Europe/Amsterdam'
    }).format(scheduledTime).replace('T', ' ')
  }
  return null
})

// Summary data
const variables = ref(null)
const emailHtml = ref(null)
const emailHtmlEn = ref(null)
const emailHtmlLt = ref(null)
const healthCheck = ref(null)
const healthCheckSummary = computed(() => {
  if (!healthCheck.value?.summary) return null
  return healthCheck.value.summary
})
const previewLanguage = ref('en')
const previewLanguageOptions = [
  { label: 'EN', value: 'en' },
  { label: 'LT', value: 'lt' }
]
const currentPreviewHtml = computed(() => {
  if (previewLanguage.value === 'lt' && emailHtmlLt.value) {
    return emailHtmlLt.value
  }
  return emailHtmlEn.value || emailHtml.value || ''
})

// Variable search and categorization
const variableSearch = ref('')

// Guest-related variable keys
const guestVarKeys = ['guestName', 'name', 'email', 'groupLabel', 'group_label', 'code', 'rsvpCode', 'preferredLanguage', 'preferred_language', 'can_bring_plus_one', 'is_primary', 'plusOneName', 'plus_one_name', 'plus_one_dietary']
// RSVP-related variable keys
const rsvpVarKeys = ['attending', 'rsvp_status', 'responded_at', 'dietary', 'notes', 'rsvpLink', 'rsvpDeadline', 'rsvpDeadlineDate', 'hasResponded', 'isAttending', 'isNotAttending', 'isPending', 'hasPlusOne', 'has_plus_one', 'isPlusOne']
// Event-related variable keys
const eventVarKeys = ['weddingDate', 'venueName', 'venueAddress', 'eventStartDate', 'eventEndDate', 'eventTime', 'brideName', 'groomName', 'eventType', 'dressCode', 'specialInstructions', 'daysUntilWedding']

const filterVariables = (varList, keys) => {
  if (!variables.value) return []
  const search = variableSearch.value.toLowerCase()
  return Object.entries(variables.value)
    .filter(([key]) => keys.includes(key))
    .filter(([key, value]) => {
      if (!search) return true
      return key.toLowerCase().includes(search) || 
             String(value).toLowerCase().includes(search)
    })
}

const filteredGuestVariables = computed(() => filterVariables(variables.value, guestVarKeys))
const filteredRsvpVariables = computed(() => filterVariables(variables.value, rsvpVarKeys))
const filteredEventVariables = computed(() => filterVariables(variables.value, eventVarKeys))
const filteredSystemVariables = computed(() => {
  if (!variables.value) return []
  const search = variableSearch.value.toLowerCase()
  const usedKeys = [...guestVarKeys, ...rsvpVarKeys, ...eventVarKeys]
  return Object.entries(variables.value)
    .filter(([key]) => !usedKeys.includes(key))
    .filter(([key, value]) => {
      if (!search) return true
      return key.toLowerCase().includes(search) || 
             String(value).toLowerCase().includes(search)
    })
})

// Get CSS class based on value type
function getValueClass(value) {
  if (value === null || value === undefined) return 'text-gray-400 italic'
  if (typeof value === 'boolean') return value ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
  if (value === '') return 'text-gray-400 italic'
  return 'text-gray-900'
}

// Loading states
const sending = ref(false)
const loadingHealthCheck = ref(false)

// Validation
const canProceed = computed(() => {
  if (currentStep.value === 1) {
    // Guest Info: name, email, group_label required
    return guestForm.name && guestForm.email && guestForm.group_label
  }
  if (currentStep.value === 2) {
    // RSVP: always valid (attending is optional)
    return true
  }
  if (currentStep.value === 3) {
    // Template Selection: template required
    return selectedTemplateId.value
  }
  if (currentStep.value === 4) {
    // Email Options: valid email required
    const email = guestForm.email || recipientEmail.value
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  return true
})

const canSend = computed(() => {
  const hasEmail = recipientEmail.value || guestForm.email || guestData.value?.email
  return canProceed.value && guestData.value && selectedTemplateId.value && hasEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hasEmail)
})

// Watch visible prop
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadTemplates()
  } else {
    resetForm()
  }
})

onMounted(() => {
  if (props.visible) {
    loadTemplates()
  }
})

function loadTemplates() {
  loadingTemplates.value = true
  fetchTemplates()
    .then(response => {
      templates.value = response.templates || []
    })
    .catch(() => {
      showError('Error', 'Failed to load templates', 5000)
    })
    .finally(() => {
      loadingTemplates.value = false
    })
}

function handleGuestSubmit() {
  if (guestFormRef.value && !guestFormRef.value.validate()) {
    return
  }
  // Generate temporary code if not provided
  const code = guestForm.code.trim() || Math.random().toString(36).substring(2, 8).toUpperCase()
  guestData.value = {
    ...guestForm,
    code,
    id: 999999 // Temporary ID
  }
  // Set recipient email from guest email if not set
  if (!recipientEmail.value && guestForm.email) {
    recipientEmail.value = guestForm.email
  }
}

function nextStep() {
  if (currentStep.value === 1) {
    // Validate and save guest data before proceeding
    handleGuestSubmit()
    if (!guestData.value) {
      return
    }
    // Set recipient email from guest email if not already set
    if (!recipientEmail.value && guestForm.email) {
      recipientEmail.value = guestForm.email
    }
  }
  if (currentStep.value === 2) {
    // Capture RSVP data before proceeding
    rsvpData.value = {
      attending: rsvpForm.attending,
      dietary: rsvpForm.dietary || null,
      notes: rsvpForm.notes || null,
      plus_one_name: rsvpForm.add_plus_one ? rsvpForm.plus_one_name : null,
      plus_one_dietary: rsvpForm.add_plus_one ? rsvpForm.plus_one_dietary : null,
      send_confirmation: rsvpForm.send_confirmation
    }
  }
  if (currentStep.value < totalSteps && canProceed.value) {
    currentStep.value++
    if (currentStep.value === 5) {
      // Load summary data when reaching summary step
      sendTestEmail(true) // Preview mode
    }
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function formatVariableValue(value) {
  if (value === null || value === undefined) return '(empty)'
  if (value === '') return '(empty string)'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

async function sendTestEmail(previewOnly = false) {
  if (!canSend.value && !previewOnly) {
    return
  }

  sending.value = true
  loadingHealthCheck.value = true

  try {
    // Use recipient email or fall back to guest email
    const emailToUse = recipientEmail.value || guestForm.email || guestData.value?.email
    
    const payload = {
      guestData: {
        ...guestData.value,
        ...rsvpData.value,
        rsvp_status: rsvpData.value?.attending === true ? 'attending' : rsvpData.value?.attending === false ? 'not_attending' : 'pending'
      },
      templateId: selectedTemplateId.value,
      templateStyle: selectedTemplateStyle.value,
      sendMode: sendMode.value,
      recipientEmail: emailToUse,
      testLanguage: testLanguage.value,
      healthCheckMode: true,
      sendRsvpConfirmation: rsvpData.value?.send_confirmation || false
    }

    const response = await sendTestEmailApi(payload)

    if (response.success) {
      variables.value = response.variables || {}
      emailHtml.value = response.emailHtml
      emailHtmlEn.value = response.emailHtmlEn
      emailHtmlLt.value = response.emailHtmlLt
      healthCheck.value = response.healthCheck

      if (!previewOnly) {
        let successMsg = 'Test email sent successfully!'
        if (response.rsvpConfirmationResult?.success) {
          successMsg += ' RSVP confirmation email also sent.'
        }
        showSuccess('Success', successMsg, 5000)
      }
    } else {
      showError('Error', response.message || 'Failed to send test email', 5000)
    }
  } catch (error) {
    showError('Error', error.response?.data?.error || error.message || 'Failed to send test email', 5000)
  } finally {
    sending.value = false
    loadingHealthCheck.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
  emit('close')
}

function resetForm() {
  currentStep.value = 1
  // Reset guest form
  guestForm.group_label = ''
  guestForm.name = ''
  guestForm.email = ''
  guestForm.code = ''
  guestForm.can_bring_plus_one = false
  guestForm.is_primary = true
  guestForm.preferred_language = 'en'
  // Reset RSVP form
  rsvpForm.attending = null
  rsvpForm.dietary = ''
  rsvpForm.notes = ''
  rsvpForm.add_plus_one = false
  rsvpForm.plus_one_name = ''
  rsvpForm.plus_one_dietary = ''
  rsvpForm.send_confirmation = false
  // Reset data
  guestData.value = null
  rsvpData.value = null
  selectedTemplateId.value = null
  selectedTemplateStyle.value = 'elegant'
  testLanguage.value = 'en'
  sendMode.value = 'immediate'
  recipientEmail.value = ''
  variables.value = null
  emailHtml.value = null
  emailHtmlEn.value = null
  emailHtmlLt.value = null
  healthCheck.value = null
  previewLanguage.value = 'en'
  variableSearch.value = ''
  sending.value = false
  loadingHealthCheck.value = false
}
</script>

<style scoped>
.test-email-modal :deep(.p-dialog-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.test-email-content {
  min-height: 0;
}
</style>

