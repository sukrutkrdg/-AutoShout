import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownMenu = ({ children }: any) => {
  const [open, setOpen] = React.useState(false)
  return <div className="relative inline-block text-left" onClick={() => setOpen(!open)}>{children}</div>
}

const DropdownMenuTrigger = ({ asChild, children, ...props }: any) => {
  return children 
}

const DropdownMenuContent = ({ align, className, children, ...props }: any) => (
  <div className={cn("absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className)} {...props}>
    {children}
  </div>
)

// TypeScript Hatası Çözümü: disabled prop'unu buraya ekledik
interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(({ className, disabled, ...props }, ref) => (
  <div 
    ref={ref} 
    // data-disabled attribute'u ekleyerek CSS'teki stilin çalışmasını sağlıyoruz
    data-disabled={disabled ? "" : undefined}
    className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} 
    {...props} 
  />
))
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator }