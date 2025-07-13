import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  BarChart3, 
  Users, 
  Shield, 
  Zap, 
  Globe, 
  Download, 
  FileSpreadsheet,
  Calculator,
  PieChart,
  Share2,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Sparkles,
  TrendingUp,
  Database,
  Filter,
  Lock,
  MessageSquare,
  Palette,
  LogIn,
  UserPlus
} from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");

  const handleCreateSpreadsheet = () => {
    if (isAuthenticated) {
      setLocation("/spreadsheet/1");
    } else {
      setLocation("/register");
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setLocation("/spreadsheet/1");
    } else {
      setLocation("/login");
    }
  };

  const handleLogin = () => {
    setLocation("/login");
  };

  const handleSignUp = () => {
    setLocation("/register");
  };

  const features = [
    {
      icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
      title: "Advanced Analytics",
      description: "Powerful charts, pivot tables, and data visualization tools to transform your data into insights."
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: "Real-time Collaboration",
      description: "Work together seamlessly with live editing, comments, and instant updates across your team."
    },
    {
      icon: <Calculator className="h-8 w-8 text-purple-600" />,
      title: "Smart Formulas",
      description: "500+ built-in functions with AI-powered suggestions and error detection for complex calculations."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Enterprise Security",
      description: "Advanced permissions, protected ranges, and enterprise-grade security for your sensitive data."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Lightning Fast",
      description: "Handle millions of rows with infinite scroll and optimized performance for large datasets."
    },
    {
      icon: <Globe className="h-8 w-8 text-indigo-600" />,
      title: "Universal Access",
      description: "Work from anywhere with cloud sync, offline mode, and cross-platform compatibility."
    }
  ];

  const advancedFeatures = [
    {
      icon: <PieChart className="h-6 w-6" />,
      title: "Interactive Charts",
      description: "Create beautiful visualizations with trendlines, error bars, and custom styling"
    },
    {
      icon: <Filter className="h-6 w-6" />,
      title: "Smart Filters",
      description: "Advanced filtering and data validation with custom rules and conditions"
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Protected Ranges",
      description: "Lock specific cells and ranges with granular permission controls"
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Smart Fill",
      description: "AI-powered pattern detection and automatic data completion"
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Threaded Comments",
      description: "Rich commenting system with @mentions and notification management"
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Conditional Formatting",
      description: "Advanced formatting rules with color scales, data bars, and icon sets"
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "External Data",
      description: "Import data from APIs, databases, and external sources in real-time"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Pivot Tables",
      description: "Powerful data analysis with drag-and-drop pivot table creation"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Data Analyst at TechCorp",
      content: "Ultimate Pixel Sheets has transformed how our team analyzes data. The real-time collaboration features are game-changing.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "CFO at StartupXYZ",
      content: "The advanced formula engine and pivot tables help us make data-driven decisions faster than ever before.",
      rating: 5
    },
    {
      name: "Emily Johnson",
      role: "Project Manager at BigCorp",
      content: "Finally, a spreadsheet tool that keeps up with our team's pace. The collaboration features are seamless.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ultimate Pixel Sheets
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
                    <Badge variant="outline">{user?.role}</Badge>
                  </div>
                  <Button onClick={handleCreateSpreadsheet} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={handleLogin}>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                  <Button onClick={handleSignUp} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Next-Generation Spreadsheets
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Supercharge
                  </span>
                  <br />
                  Your Data Analysis
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Experience the future of spreadsheets with AI-powered insights, real-time collaboration, 
                  and enterprise-grade security. Built for teams that demand more from their data.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={handleCreateSpreadsheet}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-lg px-8 py-6"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {isAuthenticated ? "Go to Dashboard" : "Start Creating Now"}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={handleGetStarted}
                  className="text-lg px-8 py-6 border-gray-300"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  {isAuthenticated ? "View Spreadsheets" : "View Demo"}
                </Button>
              </div>

              {!isAuthenticated && (
                <div className="flex items-center space-x-8 text-sm text-gray-500">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Free to start
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    No credit card required
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Unlimited collaboration
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl transform rotate-6"></div>
              <img 
                src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxzcHJlYWRzaGVldHxlbnwwfHx8fDE3NTIzODA3MzZ8MA&ixlib=rb-4.1.0&q=85"
                alt="Advanced Analytics Dashboard" 
                className="relative rounded-3xl shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features that scale with your business needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardHeader>
                  <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Google Sheets + More
            </h2>
            <p className="text-xl text-gray-600">
              All the features you love, plus powerful enhancements
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advancedFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Collaboration */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.pexels.com/photos/3184416/pexels-photo-3184416.jpeg"
                alt="Team Collaboration" 
                className="rounded-2xl shadow-xl w-full h-auto"
              />
            </div>
            <div className="space-y-6">
              <Badge className="bg-green-100 text-green-800">
                <Users className="w-4 h-4 mr-1" />
                Team Collaboration
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900">
                Work Better Together
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Experience seamless collaboration with real-time editing, live cursors, 
                commenting system, and instant notifications. Your team stays in sync, no matter where they are.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Real-time editing and live cursors</span>
                </div>
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Threaded comments with @mentions</span>
                </div>
                <div className="flex items-center">
                  <Share2 className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Granular sharing permissions</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Enterprise-grade security</span>
                </div>
              </div>

              <Button 
                size="lg" 
                onClick={handleCreateSpreadsheet}
                className="bg-gradient-to-r from-green-600 to-blue-600"
              >
                Start Collaborating
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Teams Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what data professionals are saying about Ultimate Pixel Sheets
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/80 backdrop-blur border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Data?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of teams who've already made the switch to Ultimate Pixel Sheets
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Input 
              type="email" 
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-md bg-white/90 border-0"
            />
            <Button 
              size="lg" 
              variant="secondary"
              onClick={handleCreateSpreadsheet}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <p className="text-blue-100 text-sm mt-4">
            No credit card required • Full access to all features • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Ultimate Pixel Sheets</span>
              </div>
              <p className="text-gray-400">
                The next generation of spreadsheet software for modern teams.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Ultimate Pixel Sheets. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}