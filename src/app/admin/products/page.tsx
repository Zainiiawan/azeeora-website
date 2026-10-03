'use client';

import { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { Plus, Search, Filter, Edit, Trash2, MoreVertical, X, Image as ImageIcon, Package, DollarSign, Box } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import { productApi, Product, ProductImage } from '@/lib/api/productApi';
import { categoryApi, brandApi, Category, Brand } from '@/lib/api/categoryApi';
import { mediaApi } from '@/lib/api/mediaApi';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { revalidateProductsCache } from '@/app/actions/revalidate';

const getCategoryName = (product: Product) =>
  typeof product.category === 'object' ? product.category?.name ?? '' : product.category ?? '';

const getCategoryId = (product: Product) =>
  typeof product.category === 'object' ? product.category?._id ?? '' : product.category ?? '';

const getBrandName = (product: Product) =>
  typeof product.brand === 'object' ? product.brand?.name ?? '' : product.brand ?? '';

const getBrandId = (product: Product) =>
  typeof product.brand === 'object' ? product.brand?._id ?? '' : product.brand ?? '';

const getProductStatus = (product: Product): 'Active' | 'Inactive' =>
  product.isActive !== false ? 'Active' : 'Inactive';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productVideo, setProductVideo] = useState<{ url: string; publicId?: string } | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    void Promise.all([fetchProducts(), fetchCatalog()]);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productApi.getAll();
      setProducts(response.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // You might want to show an error message here
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const [cats, brs] = await Promise.all([categoryApi.getAll(), brandApi.getAll()]);
      setCategories(cats);
      setBrands(brs);
    } catch (error) {
      console.error('Failed to fetch catalog:', error);
    }
  };

  // Form state
  const defaultCategoryId = () => categories[0]?._id ?? '';
  const defaultBrandId = () => brands[0]?._id ?? '';

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    stock: '',
    status: 'Active' as 'Active' | 'Inactive',
    description: '',
    brand: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    isComingSoon: false,
    launchDate: '',
    bv: '',
    wholesalePrice: '',
    wholesaleMinQty: '',
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || getCategoryName(product) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductImages(product.images ?? []);
      setProductVideo(product.video || null);
      setFormData({
        name: product.name,
        sku: product.sku ?? '',
        category: getCategoryId(product) || defaultCategoryId(),
        price: product.basePrice.toString(),
        stock: product.stock.toString(),
        status: getProductStatus(product),
        description: product.description || '',
        brand: getBrandId(product) || defaultBrandId(),
        discountType: product.discount?.type || 'percentage',
        discountValue: product.discount?.value?.toString() || '',
        isComingSoon: product.isComingSoon || false,
        launchDate: product.launchDate ? new Date(product.launchDate).toISOString().split('T')[0] : '',
        bv: product.bv != null ? String(product.bv) : '',
        wholesalePrice: product.wholesalePrice != null ? String(product.wholesalePrice) : '',
        wholesaleMinQty: product.wholesaleMinQty != null ? String(product.wholesaleMinQty) : '',
      });
    } else {
      setEditingProduct(null);
      setProductImages([]);
      setProductVideo(null);
      setFormData({
        name: '',
        sku: '',
        category: defaultCategoryId(),
        price: '',
        stock: '',
        status: 'Active',
        description: '',
        brand: defaultBrandId(),
        discountType: 'percentage',
        discountValue: '',
        isComingSoon: false,
        launchDate: '',
        bv: '',
        wholesalePrice: '',
        wholesaleMinQty: '',
      });
    }
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setProductImages([]);
    setProductVideo(null);
    setSaveError('');
    setFormData({
      name: '',
      sku: '',
      category: defaultCategoryId(),
      price: '',
      stock: '',
      status: 'Active',
      description: '',
      brand: defaultBrandId(),
      discountType: 'percentage',
      discountValue: '',
      isComingSoon: false,
      launchDate: '',
      bv: '',
      wholesalePrice: '',
      wholesaleMinQty: '',
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      setUploading(true);
      const uploaded = await mediaApi.upload(Array.from(files));
      setProductImages((prev) => [
        ...prev,
        ...uploaded.map((u, i) => ({
          url: u.url,
          publicId: u.publicId,
          alt: u.alt || formData.name || 'Product image',
          isMain: prev.length === 0 && i === 0,
        })),
      ]);
    } catch (error) {
      console.error('Image upload failed:', error);
      setSaveError('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      setUploadingVideo(true);
      const uploaded = await mediaApi.upload(Array.from(files));
      if (uploaded.length > 0) {
        setProductVideo({
          url: uploaded[0].url,
          publicId: uploaded[0].publicId,
        });
      }
    } catch (error) {
      console.error('Video upload failed:', error);
      setSaveError('Failed to upload video. Please try again.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.sku || !formData.category || !formData.price || !formData.stock) {
      setSaveError('Please fill in all required fields.');
      return;
    }

    try {
      setSaving(true);
      setSaveError('');
      const productData = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
        status: formData.status,
        description: formData.description,
        brand: formData.brand || undefined,
        images: productImages.length > 0 ? productImages : undefined,
        video: productVideo || undefined,
        discount: formData.discountValue
          ? {
              type: formData.discountType,
              value: parseFloat(formData.discountValue),
            }
          : null,
        isComingSoon: formData.isComingSoon,
        launchDate: formData.launchDate || undefined,
        bv: formData.bv !== '' ? Number(formData.bv) : undefined,
        wholesalePrice: formData.wholesalePrice !== '' ? Number(formData.wholesalePrice) : null,
        wholesaleMinQty: formData.wholesaleMinQty !== '' ? parseInt(formData.wholesaleMinQty, 10) : null,
      };

      if (editingProduct) {
        await productApi.update(editingProduct._id, productData);
      } else {
        await productApi.create(productData);
      }

      await revalidateProductsCache();
      await fetchProducts();
      handleCloseModal();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } })?.response?.data?.errors?.map((e) => `${e.field}: ${e.message}`).join(', ') ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error && !('response' in error) ? error.message : '') ||
        'Failed to save product. Check all fields and try again.';
      setSaveError(msg);
      console.error('Failed to save product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await productApi.delete(productId);
      await revalidateProductsCache();
      await fetchProducts();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
      // You might want to show an error message here
    }
  };

  const handleToggleStatus = async (productId: string) => {
    try {
      const product = products.find(p => p._id === productId);
      if (product) {
        const newStatus = getProductStatus(product) === 'Active' ? 'Inactive' : 'Active';
        await productApi.update(productId, { status: newStatus });
        await revalidateProductsCache();
        await fetchProducts();
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-black">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-serif font-bold text-black">Products</h1>
              <p className="text-gray-600">Manage your product inventory</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-rose-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading products...</p>
            </div>
          </div>
        ) : (
          <>
        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-2">No products found</p>
                        <Button onClick={() => handleOpenModal()}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Product
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => (
                    <motion.tr
                    key={product._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 mr-3 flex items-center justify-center overflow-hidden">
                          {product.images?.[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-black">{product.name}</p>
                          <p className="text-xs text-gray-500">{getBrandName(product)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.sku}</td>
                    <td className="px-6 py-4 text-gray-600">{getCategoryName(product)}</td>
                    <td className="px-6 py-4">
                      {product.discount && product.discount.value ? (
                        <div className="flex flex-col">
                          <span className="text-gray-400 line-through text-xs">{formatPrice(product.basePrice)}</span>
                          <span className="font-medium text-rose-gold">
                            {formatPrice(
                              product.discount.type === 'percentage'
                                ? product.basePrice * (1 - product.discount.value / 100)
                                : Math.max(0, product.basePrice - product.discount.value)
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium text-black">{formatPrice(product.basePrice)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.stock}</td>
                    <td className="px-6 py-4 flex flex-col items-start gap-1">
                      <button
                        onClick={() => handleToggleStatus(product._id)}
                        className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          getProductStatus(product) === 'Active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getProductStatus(product)}
                      </button>
                      {product.isComingSoon && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          Coming Soon
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleOpenModal(product)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                          aria-label="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(product._id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors" 
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="More">
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-black">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-black">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-black flex items-center gap-2">
                  <Package className="w-5 h-5 text-rose-gold" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter SKU"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900"
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <select
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900"
                    >
                      <option value="">No brand</option>
                      {brands.map((brand) => (
                        <option key={brand._id} value={brand._id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900 placeholder-gray-400"
                    rows={3}
                    placeholder="Enter product description"
                  />
                </div>
              </div>

              {/* Pricing & Inventory */}
              <div className="space-y-4">
                <h3 className="font-medium text-black flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-rose-gold" />
                  Pricing & Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (PKR)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter price"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter stock"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {(
                    [
                      ['bv', 'Points (BV) per unit', 'Blank = price ÷ Rs per BV'],
                      ['wholesalePrice', 'Wholesale price (PKR)', 'Blank = default wholesale discount'],
                      ['wholesaleMinQty', 'Wholesale minimum qty', 'Blank = default minimum'],
                    ] as const
                  ).map(([key, label, hint]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        type="number"
                        min={0}
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900 placeholder-gray-400"
                        placeholder={hint}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center h-full">
                    <input
                      type="checkbox"
                      id="isComingSoon"
                      checked={formData.isComingSoon}
                      onChange={(e) => setFormData({ ...formData, isComingSoon: e.target.checked })}
                      className="w-4 h-4 text-rose-gold border-gray-300 rounded focus:ring-rose-gold"
                    />
                    <label htmlFor="isComingSoon" className="ml-2 block text-sm font-medium text-gray-700">
                      Mark as Coming Soon
                    </label>
                  </div>
                  {formData.isComingSoon && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Launch Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.launchDate}
                        onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="font-medium text-black flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-rose-gold" />
                  Product Images
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-rose-gold transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={(e) => void handleImageUpload(e.target.files)}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer flex flex-col items-center justify-center ${uploading ? 'opacity-50' : ''}`}
                  >
                    <div className="w-16 h-16 bg-rose-gold/10 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon className="w-8 h-8 text-rose-gold" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">
                      {uploading ? 'Uploading…' : 'Click to upload images'}
                    </p>
                    <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {productImages.length > 0 ? (
                    productImages.map((img, i) => (
                      <div key={img.publicId || i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <img src={img.url} alt={img.alt || 'Product'} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setProductImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                          aria-label="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="col-span-4 text-sm text-gray-500 text-center py-4">No images uploaded yet</p>
                  )}
                </div>
              </div>

              {/* Video */}
              <div className="space-y-4">
                <h3 className="font-medium text-black flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-rose-gold" />
                  Product Video (Optional)
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-rose-gold transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    id="video-upload"
                    onChange={(e) => void handleVideoUpload(e.target.files)}
                    disabled={uploadingVideo}
                  />
                  <label
                    htmlFor="video-upload"
                    className={`cursor-pointer flex flex-col items-center justify-center ${uploadingVideo ? 'opacity-50' : ''}`}
                  >
                    <div className="w-16 h-16 bg-rose-gold/10 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon className="w-8 h-8 text-rose-gold" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">
                      {uploadingVideo ? 'Uploading Video…' : 'Click to upload video'}
                    </p>
                    <p className="text-sm text-gray-500">MP4, WebM up to 50MB</p>
                  </label>
                </div>
                {productVideo && (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                    <video src={productVideo.url} className="w-full h-full object-cover" controls muted />
                    <button
                      type="button"
                      onClick={() => setProductVideo(null)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
                      aria-label="Remove video"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Discount */}
              <div className="space-y-4">
                <h3 className="font-medium text-black flex items-center gap-2">
                  <Box className="w-5 h-5 text-rose-gold" />
                  Discount (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter discount value"
                    />
                  </div>
                </div>
              </div>
            </div>

            {saveError && (
              <div className="px-6 pb-2">
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{saveError}</p>
              </div>
            )}

            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSaveProduct()} disabled={saving || uploading}>
                {saving ? 'Saving…' : editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-serif font-bold text-black mb-2">Delete Product</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleDeleteProduct(deleteConfirm)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}