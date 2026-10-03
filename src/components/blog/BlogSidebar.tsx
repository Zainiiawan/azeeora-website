'use client';

import { Search, Tag } from 'lucide-react';

interface BlogSidebarProps {
  categories: string[];
  tags: string[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const BlogSidebar = ({ categories, tags, searchQuery, onSearchChange }: BlogSidebarProps) => {
  return (
    <aside className="w-full flex flex-col gap-8">
      {/* Search Widget */}
      <div className="bg-white p-6 rounded-xl shadow-sm luxury-border">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 text-sm"
          />
        </div>
      </div>

      {/* Categories Widget */}
      <div className="bg-white p-6 rounded-xl shadow-sm luxury-border">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Categories</h3>
        <ul className="flex flex-col gap-3">
          {categories.map((category, i) => (
            <li key={`${category}-${i}`}>
              <button className="text-sm text-gray-600 hover:text-rose-gold transition-colors flex items-center justify-between w-full">
                <span>{category}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Tags Widget */}
      <div className="bg-white p-6 rounded-xl shadow-sm luxury-border">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4" /> Popular Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <button
              key={`${tag}-${i}`}
              className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-600 hover:border-rose-gold hover:text-rose-gold transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default BlogSidebar;
