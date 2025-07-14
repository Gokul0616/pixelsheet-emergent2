import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Filter, 
  Lock, 
  Sparkles, 
  PieChart, 
  Database, 
  Palette, 
  Eye,
  EyeOff,
  Plus,
  Settings,
  TrendingUp,
  BarChart3,
  Table,
  FileText,
  Image,
  MessageSquare,
  Share2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
  Lightbulb,
  Search,
  Wand2,
  Brain,
  Zap
} from "lucide-react";

interface SmartFeaturesProps {
  onAction: (action: string, data?: any) => void;
}

export function SmartFeatures({ onAction }: SmartFeaturesProps) {
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Enhanced Smart Fill with better pattern detection
  const handleSmartFill = () => {
    const suggestions = [
      { 
        type: 'number_series', 
        description: 'Number series: 1, 2, 3, 4, 5...', 
        confidence: 95,
        pattern: 'arithmetic',
        increment: 1
      },
      { 
        type: 'date_series', 
        description: 'Date series: Jan 1, Jan 2, Jan 3...', 
        confidence: 90,
        pattern: 'date',
        unit: 'day'
      },
      { 
        type: 'weekday_series', 
        description: 'Weekday series: Mon, Tue, Wed...', 
        confidence: 88,
        pattern: 'weekday'
      },
      { 
        type: 'month_series', 
        description: 'Month series: Jan, Feb, Mar...', 
        confidence: 85,
        pattern: 'month'
      },
      { 
        type: 'geometric_series', 
        description: 'Geometric series: 2, 4, 8, 16...', 
        confidence: 80,
        pattern: 'geometric',
        multiplier: 2
      },
      { 
        type: 'formula_pattern', 
        description: 'Copy formula with relative references', 
        confidence: 92,
        pattern: 'formula'
      },
      { 
        type: 'text_pattern', 
        description: 'Text pattern: Item 1, Item 2, Item 3...', 
        confidence: 75,
        pattern: 'text_increment'
      }
    ];
    setSmartSuggestions(suggestions);
    setShowSuggestions(true);
  };

  // AI-powered formula suggestions with more comprehensive options
  const handleFormulaSuggestions = () => {
    onAction('formulaSuggestions', {
      suggestions: [
        { 
          formula: '=SUM(A1:A10)', 
          description: 'Calculate total of column A',
          category: 'Statistical',
          useCase: 'Sum all values in a range'
        },
        { 
          formula: '=AVERAGE(B1:B10)', 
          description: 'Calculate average of column B',
          category: 'Statistical',
          useCase: 'Find mean value'
        },
        { 
          formula: '=IF(C1>100,"High","Low")', 
          description: 'Conditional value based on C1',
          category: 'Logical',
          useCase: 'Categorize values'
        },
        { 
          formula: '=VLOOKUP(E1,A:B,2,FALSE)', 
          description: 'Lookup value from table',
          category: 'Lookup',
          useCase: 'Find related data'
        },
        { 
          formula: '=COUNTIF(A:A,">100")', 
          description: 'Count cells meeting criteria',
          category: 'Statistical',
          useCase: 'Count with conditions'
        },
        { 
          formula: '=CONCATENATE(A1," ",B1)', 
          description: 'Combine text from multiple cells',
          category: 'Text',
          useCase: 'Merge text values'
        }
      ]
    });
  };

  // Enhanced data insights with trend analysis
  const handleDataInsights = () => {
    onAction('dataInsights', {
      insights: [
        { 
          type: 'trend', 
          title: 'Increasing Trend Detected', 
          description: 'Revenue shows 15% growth over last quarter',
          confidence: 92,
          recommendation: 'Consider increasing marketing budget',
          chart: 'line'
        },
        { 
          type: 'outlier', 
          title: 'Outlier Value Found', 
          description: 'Value in B15 is 3x higher than average',
          confidence: 88,
          recommendation: 'Verify data accuracy',
          location: 'B15'
        },
        { 
          type: 'correlation', 
          title: 'Strong Correlation', 
          description: 'Sales and Marketing spend are 85% correlated',
          confidence: 85,
          recommendation: 'Optimize marketing allocation',
          correlation: 0.85
        },
        { 
          type: 'seasonality', 
          title: 'Seasonal Pattern', 
          description: 'Q4 consistently shows 30% higher sales',
          confidence: 90,
          recommendation: 'Prepare inventory for Q4',
          pattern: 'quarterly'
        },
        { 
          type: 'missing_data', 
          title: 'Missing Data Points', 
          description: '12% of cells in range A1:C100 are empty',
          confidence: 100,
          recommendation: 'Complete data collection',
          percentage: 12
        }
      ]
    });
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-blue-600">
            <Brain className="w-3 h-3 mr-1" />
            Smart Features
          </Badge>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs bg-white/50 hover:bg-white/80"
              onClick={handleSmartFill}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Smart Fill
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs bg-white/50 hover:bg-white/80"
              onClick={handleFormulaSuggestions}
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              Formula Help
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs bg-white/50 hover:bg-white/80"
              onClick={handleDataInsights}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Data Insights
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs bg-white/50 hover:bg-white/80"
              onClick={() => onAction('explore')}
            >
              <Search className="w-4 h-4 mr-1" />
              Explore
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ImportDataDialog onAction={onAction} />
          <ExportOptionsDialog onAction={onAction} />
        </div>
      </div>

      {/* Smart Suggestions Panel */}
      {showSuggestions && (
        <div className="mt-3 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Wand2 className="w-4 h-4 mr-2 text-purple-600" />
              Smart Fill Suggestions
            </h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSuggestions(false)}
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-2">
            {smartSuggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                onClick={() => onAction('applySmartFill', suggestion)}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{suggestion.description}</p>
                  <p className="text-xs text-gray-500">Confidence: {suggestion.confidence}%</p>
                </div>
                <Button size="sm" variant="outline">Apply</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImportDataDialog({ onAction }: { onAction: (action: string, data?: any) => void }) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState('csv');
  const [importUrl, setImportUrl] = useState('');

  const handleImport = () => {
    onAction('importData', {
      type: importType,
      url: importUrl
    });
    setImportDialogOpen(false);
  };

  return (
    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs bg-white/50 hover:bg-white/80">
          <Upload className="w-4 h-4 mr-1" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import External Data</DialogTitle>
          <DialogDescription>
            Import data from various sources into your spreadsheet
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Import Type</label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV File</SelectItem>
                <SelectItem value="json">JSON API</SelectItem>
                <SelectItem value="xml">XML Data</SelectItem>
                <SelectItem value="html">HTML Table</SelectItem>
                <SelectItem value="database">Database Query</SelectItem>
                <SelectItem value="finance">Finance API</SelectItem>
                <SelectItem value="web-scraping">Web Scraping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(importType === 'json' || importType === 'xml' || importType === 'html') && (
            <div>
              <label className="text-sm font-medium">URL or Endpoint</label>
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://api.example.com/data"
              />
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 Imported data will automatically refresh every hour. You can change this in settings.
            </p>
          </div>

          <Button onClick={handleImport} className="w-full">
            <Database className="w-4 h-4 mr-2" />
            Import Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExportOptionsDialog({ onAction }: { onAction: (action: string, data?: any) => void }) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportRange, setExportRange] = useState('current_sheet');
  const [includeFormatting, setIncludeFormatting] = useState(true);
  const [includeFormulas, setIncludeFormulas] = useState(true);

  const handleExport = async () => {
    try {
      onAction('exportData', {
        format: exportFormat,
        range: exportRange,
        options: {
          includeFormatting,
          includeFormulas,
          sheetName: 'Ultimate Pixel Sheet'
        }
      });
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs bg-white/50 hover:bg-white/80">
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Spreadsheet</DialogTitle>
          <DialogDescription>
            Export your data in various formats with advanced options
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx) - Full featured</SelectItem>
                <SelectItem value="csv">CSV - Data only</SelectItem>
                <SelectItem value="pdf">PDF - Print ready</SelectItem>
                <SelectItem value="json">JSON - Structured data</SelectItem>
                <SelectItem value="html">HTML - Web format</SelectItem>
                <SelectItem value="ods">OpenDocument (.ods)</SelectItem>
                <SelectItem value="tsv">Tab-separated (.tsv)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Export Range</label>
            <Select value={exportRange} onValueChange={setExportRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_sheet">Current sheet</SelectItem>
                <SelectItem value="all_sheets">All sheets</SelectItem>
                <SelectItem value="selected_range">Selected range only</SelectItem>
                <SelectItem value="visible_cells">Visible cells only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(exportFormat === 'xlsx' || exportFormat === 'html' || exportFormat === 'pdf') && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-formatting"
                  checked={includeFormatting}
                  onCheckedChange={(checked) => setIncludeFormatting(checked === true)}
                />
                <Label htmlFor="include-formatting">Include cell formatting</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-formulas"
                  checked={includeFormulas}
                  onCheckedChange={(checked) => setIncludeFormulas(checked === true)}
                />
                <Label htmlFor="include-formulas">Include formulas</Label>
              </div>
            </div>
          )}

          <div className={`p-3 rounded-lg ${
            exportFormat === 'xlsx' ? 'bg-green-50' : 
            exportFormat === 'pdf' ? 'bg-blue-50' :
            exportFormat === 'csv' ? 'bg-yellow-50' : 'bg-gray-50'
          }`}>
            <p className="text-xs text-gray-800">
              {exportFormat === 'xlsx' && '📊 Excel format preserves all formatting, formulas, and data types'}
              {exportFormat === 'pdf' && '📄 PDF format creates presentation-ready documents with charts'}
              {exportFormat === 'csv' && '📝 CSV format is ideal for data import/export and analysis'}
              {exportFormat === 'json' && '🔧 JSON format is perfect for API integration and data processing'}
              {exportFormat === 'html' && '🌐 HTML format creates web-ready tables with styling'}
            </p>
          </div>

          <Button onClick={handleExport} className="w-full">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}