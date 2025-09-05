<script lang="ts">
    // Your global CSS (create app.css in step 2)
    import '../app.css';
  
    // Pick ONE of these:
    // Minimal base:
    // import 'svelte-material-ui/bare.css';
  
    // Or themed:
    import 'svelte-material-ui/themes/svelte.css';
</script>
  
<svelte:head>
    <!-- Roboto (Material font) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
</svelte:head>

<slot />