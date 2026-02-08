import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from './cn';

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, disabled, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'group/switch block h-5 w-8 shrink-0 p-0.5 outline-none focus:outline-none cursor-pointer',
      disabled && 'cursor-not-allowed opacity-50',
      className,
    )}
    ref={ref}
    disabled={disabled}
    {...props}
  >
    <div
      className={cn(
        'h-4 w-7 rounded-full p-0.5 outline-none transition-colors duration-200 ease-out',
        !disabled && [
          'bg-surface-200',
          'group-hover/switch:bg-surface-300',
          'group-focus-visible/switch:ring-2 group-focus-visible/switch:ring-primary-500/20',
          'group-data-[state=checked]/switch:bg-primary-500',
          'group-hover/switch:group-data-[state=checked]/switch:bg-primary-600',
        ],
        disabled && 'bg-surface-100',
      )}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block size-3 rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-out',
          'translate-x-0 group-data-[state=checked]/switch:translate-x-3',
          !disabled && 'group-active/switch:scale-90',
        )}
      />
    </div>
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
