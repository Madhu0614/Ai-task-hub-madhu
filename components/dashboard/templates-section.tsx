"use client";

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TemplateCard from './template-card';
import { boardTemplates, boardService } from '@/lib/boards';
import { User } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface TemplatesSectionProps {
  user: User;
  onBoardCreate: () => void;
}

export default function TemplatesSection({ user, onBoardCreate }: TemplatesSectionProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleTemplateClick = async (template: any) => {
    try {
      const boardName = template.name === 'Blank board' ? 'Untitled' : template.name;
      
      toast({
        title: "Creating board...",
        description: "Please wait while we set up your new board.",
      });

      console.log('Creating board:', { name: boardName, type: template.type });
      
      const newBoard = await boardService.createBoard(boardName, template.type);
      
      console.log('Board created successfully:', newBoard);
      
      toast({
        title: "Board created!",
        description: `${boardName} has been created successfully.`,
      });
      
      onBoardCreate();
      router.push(`/board/${newBoard.id}`);
    } catch (error) {
      console.error('Error creating board:', error);
      toast({
        title: "Failed to create board",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {boardTemplates.map((template, index) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => handleTemplateClick(template)}
              index={index}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="flex justify-center"
      >
        <Button 
          variant="ghost" 
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          From Miroverse
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}