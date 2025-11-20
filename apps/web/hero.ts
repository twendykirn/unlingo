// hero.ts
import { heroui } from '@heroui/react';
import plugin from 'tailwindcss/plugin.js';

const h: ReturnType<typeof plugin> = heroui();

export default h;
