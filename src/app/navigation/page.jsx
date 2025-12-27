'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

// Demo page components
const HomePage = () => (
  <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6 sm:p-8">
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-6 sm:p-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Home</h1>
        <p className="text-gray-600 mb-6">
          Welcome to the Navigation playground. This is the home page. Swipe left or use the navigation to explore other pages.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Desktop View</h3>
            <p className="text-sm text-blue-700">On large screens, you'll see a sidebar navigation on the left.</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg">
            <h3 className="font-semibold text-indigo-900 mb-2">Mobile View</h3>
            <p className="text-sm text-indigo-700">On small screens, navigation appears at the bottom with swipe gestures.</p>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

const AboutPage = () => (
  <div className="h-full bg-gradient-to-br from-green-50 to-emerald-100 p-6 sm:p-8">
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-6 sm:p-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">About</h1>
        <p className="text-gray-600 mb-6">
          This is the About page. The Navigation component provides smooth transitions between pages with swipe gestures on mobile devices.
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Features</h3>
            <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
              <li>Responsive sidebar (desktop) and bottom nav (mobile)</li>
              <li>Swipe gestures for page transitions</li>
              <li>Smooth animations with Framer Motion</li>
              <li>Client-side navigation</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

const ServicesPage = () => (
  <div className="h-full bg-gradient-to-br from-purple-50 to-pink-100 p-6 sm:p-8">
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-6 sm:p-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Services</h1>
        <p className="text-gray-600 mb-6">
          This is the Services page. Try swiping left or right on mobile to navigate between pages.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Web Development', 'Mobile Apps', 'Consulting'].map((service, index) => (
            <motion.div
              key={service}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-purple-50 rounded-lg border border-purple-200"
            >
              <h3 className="font-semibold text-purple-900 mb-2">{service}</h3>
              <p className="text-sm text-purple-700">Service description goes here.</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </div>
);

const ContactPage = () => (
  <div className="h-full bg-gradient-to-br from-orange-50 to-red-100 p-6 sm:p-8">
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-6 sm:p-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Contact</h1>
        <p className="text-gray-600 mb-6">
          This is the Contact page. The navigation component handles all transitions smoothly.
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-2">Get in Touch</h3>
            <p className="text-sm text-orange-700">
              You can customize the Navigation component to accept any child elements and navigation items.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

export default function NavigationPlayground() {
  const [navigationItems] = useState([
    {
      label: 'Home',
      icon: 'pi pi-home',
    },
    {
      label: 'About',
      icon: 'pi pi-info-circle',
    },
    {
      label: 'Services',
      icon: 'pi pi-cog',
    },
    {
      label: 'Contact',
      icon: 'pi pi-envelope',
    },
  ]);

  return (
    <div className="h-dvh flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Navigation Playground</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Responsive navigation with swipe gestures</p>
            </div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <Navigation items={navigationItems}>
          <HomePage key="home" />
          <AboutPage key="about" />
          <ServicesPage key="services" />
          <ContactPage key="contact" />
        </Navigation>
      </div>
    </div>
  );
}
