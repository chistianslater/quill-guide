import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface TableData {
  rows: string[];
  columns: string[];
  cells: {
    row: number;
    col: number;
    value?: string;
    isInput: boolean;
    correctAnswer?: string;
  }[][];
}

interface ChoiceData {
  question: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
}

interface InteractiveTaskProps {
  taskType: string;
  interactiveElement: {
    type: 'table' | 'choices' | 'inputs' | 'none';
    data: any;
  };
  onSubmit?: (answers: any) => void;
  readOnly?: boolean;
}

export const InteractiveTask = ({ taskType, interactiveElement, onSubmit, readOnly = false }: InteractiveTaskProps) => {
  const [answers, setAnswers] = useState<any>({});
  const [validation, setValidation] = useState<any>({});

  useEffect(() => {
    // Initialize answers based on task type
    if (interactiveElement.type === 'table' && interactiveElement.data) {
      const tableData = interactiveElement.data as TableData;
      const initialAnswers: any = {};
      tableData.cells?.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell.isInput) {
            initialAnswers[`${rowIdx}-${colIdx}`] = '';
          }
        });
      });
      setAnswers(initialAnswers);
    }
  }, [interactiveElement]);

  const handleTableInput = (rowIdx: number, colIdx: number, value: string) => {
    setAnswers((prev: any) => ({
      ...prev,
      [`${rowIdx}-${colIdx}`]: value
    }));
  };

  const handleChoiceSelect = (optionIdx: number) => {
    setAnswers({ selectedOption: optionIdx });
  };

  const handleValidate = () => {
    if (interactiveElement.type === 'table' && interactiveElement.data) {
      const tableData = interactiveElement.data as TableData;
      const newValidation: any = {};
      
      tableData.cells?.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell.isInput && cell.correctAnswer) {
            const userAnswer = answers[`${rowIdx}-${colIdx}`] || '';
            newValidation[`${rowIdx}-${colIdx}`] = userAnswer === cell.correctAnswer;
          }
        });
      });
      
      setValidation(newValidation);
      
      if (onSubmit) {
        onSubmit({ answers, validation: newValidation });
      }
    } else if (interactiveElement.type === 'choices' && interactiveElement.data) {
      const choiceData = interactiveElement.data as ChoiceData;
      const isCorrect = choiceData.options[answers.selectedOption]?.isCorrect || false;
      setValidation({ isCorrect });
      
      if (onSubmit) {
        onSubmit({ answer: answers.selectedOption, isCorrect });
      }
    }
  };

  if (interactiveElement.type === 'table' && interactiveElement.data) {
    const tableData = interactiveElement.data as TableData;
    
    // Check if table data is complete
    if (!tableData.columns || !tableData.rows || !tableData.cells || 
        tableData.columns.length === 0 || tableData.rows.length === 0 || tableData.cells.length === 0) {
      return (
        <Card className="p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground text-center">
            ⚠️ Die Tabelle konnte nicht vollständig geladen werden. Bitte lade die Aufgabe neu hoch.
          </p>
        </Card>
      );
    }
    
    return (
      <Card className="p-4 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border p-2 bg-muted"></th>
                {tableData.columns.map((col, idx) => (
                  <th key={idx} className="border border-border p-2 bg-muted font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.cells.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="border border-border p-2 bg-muted font-semibold">
                    {tableData.rows[rowIdx] || ''}
                  </td>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} className="border border-border p-2 text-center">
                      {cell.isInput ? (
                        <div className="relative">
                          <Input
                            type="text"
                            value={answers[`${rowIdx}-${colIdx}`] || ''}
                            onChange={(e) => handleTableInput(rowIdx, colIdx, e.target.value)}
                            className={`text-center ${
                              validation[`${rowIdx}-${colIdx}`] === true
                                ? 'border-green-500 bg-green-50'
                                : validation[`${rowIdx}-${colIdx}`] === false
                                ? 'border-red-500 bg-red-50'
                                : ''
                            }`}
                            disabled={readOnly}
                          />
                          {validation[`${rowIdx}-${colIdx}`] === true && (
                            <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                          )}
                          {validation[`${rowIdx}-${colIdx}`] === false && (
                            <X className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-red-600" />
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{cell.value}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <Button onClick={handleValidate} className="w-full">
            Überprüfen
          </Button>
        )}
      </Card>
    );
  }

  if (interactiveElement.type === 'choices' && interactiveElement.data) {
    const choiceData = interactiveElement.data as ChoiceData;
    
    return (
      <Card className="p-4 space-y-4">
        <p className="font-medium">{choiceData.question}</p>
        <div className="space-y-2">
          {choiceData.options.map((option, idx) => (
            <Button
              key={idx}
              variant={answers.selectedOption === idx ? "default" : "outline"}
              className={`w-full justify-start ${
                validation.isCorrect !== undefined
                  ? answers.selectedOption === idx
                    ? option.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : option.isCorrect && validation.isCorrect === false
                    ? 'border-green-500'
                    : ''
                  : ''
              }`}
              onClick={() => !readOnly && handleChoiceSelect(idx)}
              disabled={readOnly}
            >
              {option.text}
              {validation.isCorrect !== undefined && answers.selectedOption === idx && (
                option.isCorrect ? (
                  <Check className="ml-auto h-4 w-4 text-green-600" />
                ) : (
                  <X className="ml-auto h-4 w-4 text-red-600" />
                )
              )}
            </Button>
          ))}
        </div>
        {!readOnly && answers.selectedOption !== undefined && (
          <Button onClick={handleValidate} className="w-full">
            Überprüfen
          </Button>
        )}
      </Card>
    );
  }

  return null;
};
