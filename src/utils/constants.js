export const ACCOUNT_COLORS = [
  { name: 'Predeterminado', value: 'default', hex: 'bg-surface border-white/5',       baseIcon: 'bg-gray-500'   },
  { name: 'Rojo Carmesí',   value: 'red',     hex: 'bg-red-900/20 border-red-500/30',     baseIcon: 'bg-red-500'    },
  { name: 'Azul Océano',    value: 'blue',    hex: 'bg-blue-900/20 border-blue-500/30',   baseIcon: 'bg-blue-500'   },
  { name: 'Verde Esmeralda',value: 'green',   hex: 'bg-green-900/20 border-green-500/30', baseIcon: 'bg-green-500'  },
  { name: 'Morado Real',    value: 'purple',  hex: 'bg-purple-900/20 border-purple-500/30',baseIcon: 'bg-purple-500'},
  { name: 'Naranja Cobre',  value: 'orange',  hex: 'bg-orange-900/20 border-orange-500/30',baseIcon: 'bg-orange-500'},
];

// Lookup rápido value → clase de Tailwind (para uso sin iterar el array)
export const ACCOUNT_COLOR_CLASSES = Object.fromEntries(
    ACCOUNT_COLORS.map(c => [c.value, c.hex])
);
