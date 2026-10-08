'use client';

import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { RootState } from '@/store';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { removeItem, updateQuantity, setCartItems, setCouponCode as setCartCouponCode, setDiscount } from '@/store/slices/cartSlice';
import { cartApi } from '@/lib/api/cartApi';
import { couponApi } from '@/lib/api/couponApi';
import { mapApiCartToReduxItems } from '@/lib/cartUtils';

export default function CartPage() {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const originalSubtotal = cartItems.reduce((sum, item) => sum + (item.product.basePrice || item.price) * item.quantity, 0);
  const effectiveSubtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const productDiscount = originalSubtotal - effectiveSubtotal;
  const shipping = effectiveSubtotal > 5000 ? 0 : effectiveSubtotal > 0 ? 300 : 0;
  const couponDiscountAmount = useSelector((state: RootState) => state.cart.discount);
  const totalDiscount = productDiscount + couponDiscountAmount;
  const total = effectiveSubtotal + shipping - couponDiscountAmount;

  const estimatedBV = cartItems.reduce((sum, item) => {
    const unitPoints = typeof (item.product as any).bv === 'number' && (item.product as any).bv >= 0
      ? (item.product as any).bv
      : Math.max(1, Math.round(item.price / 100));
    return sum + unitPoints * item.quantity;
  }, 0);
  const estimatedLoyaltyPoints = Math.max(1, Math.round(effectiveSubtotal / 100));

  useEffect(() => {
    if (!isAuthenticated) return;
    setSyncing(true);
    cartApi
      .get()
      .then((cart) => {
        dispatch(setCartItems(mapApiCartToReduxItems(cart)));
        dispatch(setDiscount(cart.couponDiscount ?? 0));
        if (cart.couponCode) {
          setCouponCode(cart.couponCode);
          dispatch(setCartCouponCode(cart.couponCode));
        }
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [isAuthenticated, dispatch]);

  const syncCartFromApi = async () => {
    if (!isAuthenticated) return;
    const cart = await cartApi.get();
    dispatch(setCartItems(mapApiCartToReduxItems(cart)));
    dispatch(setDiscount(cart.couponDiscount ?? 0));
    dispatch(setCartCouponCode(cart.couponCode ?? null));
  };

  const handleUpdateQuantity = async (
    productId: string,
    variant: string | undefined,
    newQuantity: number
  ) => {
    if (newQuantity < 1) {
      dispatch(removeItem({ productId, variant }));
      if (isAuthenticated) {
        try {
          await cartApi.removeItem(productId);
        } catch {
          await syncCartFromApi();
        }
      }
      return;
    }
    dispatch(updateQuantity({ productId, variant, quantity: newQuantity }));
    if (isAuthenticated) {
      try {
        await cartApi.updateItem(productId, newQuantity);
      } catch {
        await syncCartFromApi();
      }
    }
  };

  const handleRemoveItem = async (productId: string, variant: string | undefined) => {
    dispatch(removeItem({ productId, variant }));
    if (isAuthenticated) {
      try {
        await cartApi.removeItem(productId);
      } catch {
        await syncCartFromApi();
      }
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      if (isAuthenticated) {
        const cart = await cartApi.applyCoupon(couponCode.trim());
        dispatch(setCartItems(mapApiCartToReduxItems(cart)));
        dispatch(setDiscount(cart.couponDiscount ?? 0));
        dispatch(setCartCouponCode(cart.couponCode ?? couponCode.trim().toUpperCase()));
      } else {
        const result = await couponApi.validate(couponCode.trim(), effectiveSubtotal);
        if (result.isValid) {
          dispatch(setDiscount(result.discount));
          dispatch(setCartCouponCode(couponCode.trim().toUpperCase()));
        } else {
          alert('Invalid coupon code');
        }
      }
    } catch {
      alert('Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  if (cartItems.length === 0 && !syncing) {
    return (
      <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-rose-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-rose-gold" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-black mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some products to get started</p>
          <Link href="/shop">
            <Button>Start Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-serif font-bold text-black mb-1">Shopping Cart</h1>
          <p className="text-gray-600">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => (
              <motion.div
                key={`${item.product._id}-${item.variant}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="flex gap-4">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden"
                  >
                    {item.product.images?.[0]?.url ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.images[0].alt || item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-xs">Image</span>
                      </div>
                    )}
                  </Link>

                  <div className="flex-1">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="font-semibold text-black hover:text-rose-gold transition-colors"
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <p className="text-sm text-gray-500 mt-1">Variant: {item.variant}</p>
                    )}
                    <p className="text-rose-gold font-bold mt-2">{formatPrice(item.price)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleRemoveItem(item.product._id, item.variant)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleUpdateQuantity(item.product._id, item.variant, item.quantity - 1)
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-rose-gold hover:text-rose-gold transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() =>
                          handleUpdateQuantity(item.product._id, item.variant, item.quantity + 1)
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-rose-gold hover:text-rose-gold transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{formatPrice(item.total)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-serif font-bold text-black mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span>{formatPrice(originalSubtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(totalDiscount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-4 flex justify-between font-bold text-black text-lg">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                {effectiveSubtotal > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-rose font-medium bg-[#fcf5f7] px-3 py-1.5 rounded border border-rose/20">
                      <span>✨ Order Points (BV / BP):</span>
                      <span className="font-bold">{estimatedBV} BP</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-700 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                      <span>🎁 Reward Points:</span>
                      <span className="font-medium">+{estimatedLoyaltyPoints} pts</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:border-rose-gold focus:ring-2 focus:ring-rose-gold/30 focus:outline-none"
                  />
                  <Button variant="outline" onClick={handleApplyCoupon} loading={couponLoading}>
                    Apply
                  </Button>
                </div>
              </div>

              <Link href="/checkout" className="block">
                <Button className="w-full" size="lg">
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <div className="mt-4 text-center">
                <Link href="/shop" className="text-sm text-rose-gold hover:text-rose-gold-dark">
                  Continue Shopping
                </Link>
              </div>

              {shipping > 0 && effectiveSubtotal > 0 && (
                <div className="mt-6 p-4 bg-rose-gold/10 rounded-lg">
                  <p className="text-sm text-rose-gold">
                    Add {formatPrice(5000 - effectiveSubtotal)} more for free shipping!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
