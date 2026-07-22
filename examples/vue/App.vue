<script setup lang="ts">
import "@mind-matrix/lucid-components";

function onClick() {
  console.log("clicked");
}
</script>

<template>
  <lucid-button variant="primary" @click="onClick">
    Hello from Vue
  </lucid-button>
</template>
