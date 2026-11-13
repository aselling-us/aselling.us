<script lang="ts">
	let { data }: { data: { post: { title: string; body: string } } } = $props();
</script>

<h1>{data.post.title}</h1>
{@html data.post.body}