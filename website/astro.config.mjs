import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://kitchook.com',
  integrations: [
    starlight({
      title: 'KitchooK! Docs',
      description: 'Build a portable static cookbook from Markdown recipes.',
      head: [
        { tag: 'meta', attrs: { name: 'theme-color', content: '#fff8e7' } },
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://kitchook.com/social-card.png' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'KitchooK! — Markdown recipes, made portable.' } },
      ],
      components: {
        SiteTitle: './src/components/DocsSiteTitle.astro',
      },
      sidebar: [
        {
          label: 'Introduction',
          items: [
            { label: 'What KitchooK! is', slug: 'docs/introduction' },
            { label: 'How it works', slug: 'docs/introduction/how-it-works' },
            { label: 'Quick start', slug: 'docs/introduction/quick-start' },
          ],
        },
        {
          label: 'Authoring',
          items: [
            { label: 'Recipes and images', slug: 'docs/authoring/recipes-and-images' },
            { label: 'Frontmatter and Markdown', slug: 'docs/authoring/frontmatter-and-markdown' },
          ],
        },
        {
          label: 'Building',
          items: [
            { label: 'Local source build', slug: 'docs/building/local-source-build' },
            { label: 'Builder container', slug: 'docs/building/builder-container' },
            { label: 'Configuration', slug: 'docs/building/configuration' },
          ],
        },
        {
          label: 'Deploying',
          items: [
            { label: 'Static web servers', slug: 'docs/deploying/static-web-servers' },
            { label: 'Cloud hosting and automation', slug: 'docs/deploying/cloud-hosting-and-automation' },
            { label: 'TrueNAS and Caddy deployment', slug: 'docs/deploying/truenas' },
          ],
        },
        {
          label: 'Operating',
          items: [
            { label: 'Upgrades and rollback', slug: 'docs/operating/upgrades-and-rollback' },
            { label: 'Security and recovery', slug: 'docs/operating/security-and-recovery' },
          ],
        },
        {
          label: 'Project',
          items: [
            { label: 'Architecture', slug: 'docs/project/architecture' },
            { label: 'JSON export', slug: 'docs/project/json-export' },
            { label: 'Contributing and security', slug: 'docs/project/contributing-and-security' },
          ],
        },
      ],
      customCss: ['./src/styles/docs.css'],
    }),
  ],
});
