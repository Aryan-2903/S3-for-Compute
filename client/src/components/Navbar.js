import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cpu, BarChart3, FunctionSquare, DollarSign } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/functions', label: 'Functions', icon: FunctionSquare },
    { path: '/monitoring', label: 'Monitoring', icon: Cpu },
    { path: '/costs', label: 'Costs', icon: DollarSign },
  ];

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Cpu className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-800">
                S3 for Compute
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
