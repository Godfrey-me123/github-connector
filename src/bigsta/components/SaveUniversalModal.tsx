import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_DOCUMENT_CATEGORIES } from "../utils/templateCategoryEngine";

interface SaveUniversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (categoryId: string) => void;
  defaultCategoryId?: string;
}

export const SaveUniversalModal: React.FC<SaveUniversalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultCategoryId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    defaultCategoryId || SUPPORTED_DOCUMENT_CATEGORIES[0]?.id || "nida",
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Save Universal Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-500">Select the destination category for this universal template:</p>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_DOCUMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(selectedCategory)}>Save as Universal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
