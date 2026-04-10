<script setup lang="ts">
import type { HubCompanyRow } from '../../../types/company';

defineProps<{ company: HubCompanyRow }>();
</script>

<template>
  <div class="cft">
    <table class="cft__tbl">
      <tbody>
        <tr v-if="company.category">
          <th>Category</th>
          <td>{{ company.category }}</td>
        </tr>
        <tr v-if="company.region">
          <th>Region</th>
          <td>{{ company.region }}</td>
        </tr>
        <tr v-if="company.hq_city">
          <th>HQ</th>
          <td>{{ company.hq_city }}{{ company.hq_country ? ', ' + company.hq_country : '' }}</td>
        </tr>
        <tr v-if="company.size">
          <th>Size</th>
          <td>{{ company.size }}</td>
        </tr>
        <tr v-if="company.founded">
          <th>Founded</th>
          <td>{{ company.founded }}</td>
        </tr>
        <tr v-if="company.note">
          <th>Note</th>
          <td class="cft__note">{{ company.note }}</td>
        </tr>
        <tr v-if="company.description">
          <th>About</th>
          <td class="cft__desc">{{ company.description }}</td>
        </tr>
        <tr v-if="company.website">
          <th>Web</th>
          <td>
            <a
              :href="
                company.website.startsWith('http') ? company.website : 'https://' + company.website
              "
              target="_blank"
              rel="noopener"
              class="cft__link"
            >
              {{ company.website }}
            </a>
          </td>
        </tr>
        <tr v-if="company.linkedin_url">
          <th>LinkedIn</th>
          <td>
            <a :href="company.linkedin_url" target="_blank" rel="noopener" class="cft__link">
              Profile ↗
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.cft {
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cft__tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.cft__tbl th {
  font-weight: 400;
  color: #555550;
  text-align: left;
  padding: 0.2rem 0.5rem 0.2rem 0;
  width: 6rem;
  white-space: nowrap;
  vertical-align: top;
}

.cft__tbl td {
  color: #d4d4cc;
  padding: 0.2rem 0;
  vertical-align: top;
}

.cft__note {
  color: #8a8a82;
  font-style: italic;
}

.cft__desc {
  color: #b0b0a8;
  line-height: 1.45;
}

.cft__link {
  color: #7dd3fc;
  text-decoration: none;
}

.cft__link:hover {
  text-decoration: underline;
}
</style>
