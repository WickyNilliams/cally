<script setup lang="ts">
import { ref } from "vue";
import "cally";

const value = ref("");

// a function prop, which must be set as a property rather than an attribute.
// vue only does so if the name matches the property, so it must be camelCase
const isThirteenth = (date: Date) => date.getUTCDate() === 13;
</script>

<template>
  <output>{{ value }}</output>
  <button @click="value = '2024-03-20/2024-03-22'">Select</button>

  <calendar-range
    locale="en-GB"
    :months="2"
    focused-date="2024-03-01"
    :isDateDisallowed="isThirteenth"
    v-model.lazy="value"
  >
    <calendar-month />
    <calendar-month :offset="1" />
  </calendar-range>
</template>
