export const theme = {
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',    // ✅ Darker than before
    tertiary: 'text-gray-600',     // ✅ Darker than before
    disabled: 'text-gray-600',
    inverse: 'text-white',
  },
  bg: {
    primary: 'bg-white',
    secondary: 'bg-gray-100',      // ✅ Slightly darker for contrast
    tertiary: 'bg-gray-100',
    hover: 'hover:bg-gray-200',    // ✅ More visible
  },
  border: {
    default: 'border-gray-300',    // ✅ More visible
    light: 'border-gray-200',
    dark: 'border-gray-400',
  },
  placeholder: 'placeholder-gray-500', // ✅ Much more visible
}

export default function NuilderPage() {
  return <div>Nuilder Page</div>;
}
