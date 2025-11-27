import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

const AlertDialog = ({ open, onOpenChange, children }: any) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
        {children}
      </div>
    </div>
  )
}

const AlertDialogContent = ({ className, ...props }: any) => <div className={cn("grid gap-4", className)} {...props} />
const AlertDialogHeader = ({ className, ...props }: any) => <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
const AlertDialogTitle = ({ className, ...props }: any) => <h2 className={cn("text-lg font-semibold", className)} {...props} />
const AlertDialogDescription = ({ className, ...props }: any) => <p className={cn("text-sm text-muted-foreground", className)} {...props} />
const AlertDialogFooter = ({ className, ...props }: any) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
const AlertDialogCancel = ({ className, ...props }: any) => <Button variant="outline" className={cn("mt-2 sm:mt-0", className)} {...props} />
const AlertDialogAction = ({ className, ...props }: any) => <Button className={cn(className)} {...props} />

export { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction }