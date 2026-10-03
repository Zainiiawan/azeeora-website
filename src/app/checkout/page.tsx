'use client';

import { useMemo, useState, useEffect, Suspense } from 'react';
import { m as motion } from 'framer-motion';
import { Smartphone, Truck, Lock, Check, ShoppingBag, ArrowLeft, Mail, User, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { clearCart } from '@/store/slices/cartSlice';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { orderApi, PaymentMethod } from '@/lib/api/orderApi';
import { paymentApi } from '@/lib/api/paymentApi';
import { productApi } from '@/lib/api/productApi';
import { shippingApi } from '@/lib/api/shippingApi';
import { settingsApi } from '@/lib/api/settingsApi';
import ManualPaymentCard from '@/components/payments/ManualPaymentCard';
import { getEffectivePrice } from '@/lib/productUtils';
import { memberApi } from '@/lib/api/memberApi';
import { extrasApi } from '@/lib/api/extrasApi';
import { getRef } from '@/lib/member/referral';
import { Wallet, Sparkles } from 'lucide-react';

interface CheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

function CheckoutContent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isBuyNow = searchParams?.get('buyNow') === 'true';
  const buyNowProductId = searchParams?.get('productId');
  const buyNowQuantity = parseInt(searchParams?.get('quantity') || '1', 10);

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);

  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartDiscount = useSelector((state: RootState) => state.cart.discount);
  const couponCode = useSelector((state: RootState) => state.cart.couponCode);

  const { data: buyNowProduct, isLoading: isLoadingBuyNow } = useQuery({
    queryKey: ['product', buyNowProductId],
    queryFn: () => productApi.getById(buyNowProductId!),
    enabled: isBuyNow && !!buyNowProductId,
  });

  const { data: accounts } = useQuery({
    queryKey: ['payment-accounts'],
    queryFn: paymentApi.getAccounts,
  });

  const { data: shippingRates } = useQuery({
    queryKey: ['shipping-rates'],
    queryFn: shippingApi.getAllRates,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: settingsApi.getSettings,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CheckoutFormData>({
    defaultValues: {
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      country: 'Pakistan',
      paymentMethod: 'cod',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const selectedCity = watch('city');

  // Wallet, loyalty points and partner referral, priced by the server
  const [walletWanted, setWalletWanted] = useState(0);
  const [pointsWanted, setPointsWanted] = useState(0);
  const [refCode, setRefCode] = useState<string | undefined>(undefined);
  const [pickupId, setPickupId] = useState('');
  const { data: pickupPoints = [] } = useQuery({ queryKey: ['pickup-points'], queryFn: extrasApi.pickupPoints.list });
  useEffect(() => setRefCode(getRef()), []);
  const [debouncedCity, setDebouncedCity] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCity((selectedCity || '').trim()), 400);
    return () => clearTimeout(t);
  }, [selectedCity]);

  const paymentMethods = useMemo(
    () =>
      [
        { id: 'cod' as const, name: 'Cash on Delivery', icon: Truck, description: 'Pay when you receive your order' },
        { id: 'jazzcash' as const, name: 'JazzCash', icon: Smartphone, description: 'Manual transfer + screenshot' },
        { id: 'easypaisa' as const, name: 'Easypaisa', icon: Smartphone, description: 'Manual transfer + screenshot' },
      ] as const,
    []
  );

  const account =
    paymentMethod === 'jazzcash'
      ? accounts?.jazzcash
      : paymentMethod === 'easypaisa'
        ? accounts?.easypaisa
        : null;

  // Determine items to checkout
  const checkoutItems = useMemo(() => {
    if (isBuyNow && buyNowProduct) {
      const price = getEffectivePrice(buyNowProduct);
      return [{
        product: {
          _id: buyNowProduct._id,
          name: buyNowProduct.name,
          images: buyNowProduct.images,
          basePrice: buyNowProduct.basePrice,
        },
        quantity: buyNowQuantity,
        price,
        total: price * buyNowQuantity
      }];
    }
    return cartItems;
  }, [isBuyNow, buyNowProduct, buyNowQuantity, cartItems]);

  const originalSubtotal = checkoutItems.reduce((sum, item) => sum + (item.product.basePrice || item.price) * item.quantity, 0);
  const effectiveSubtotal = checkoutItems.reduce((sum, item) => sum + item.total, 0);
  const productDiscount = originalSubtotal - effectiveSubtotal;
  
  const calculatedShipping = useMemo(() => {
    if (effectiveSubtotal === 0) return 0;
    
    // Check free shipping threshold
    const freeThreshold = storeSettings?.freeShippingThreshold ?? 5000;
    if (effectiveSubtotal > freeThreshold) return 0;

    if (selectedCity && shippingRates) {
      const cityRate = shippingRates.find(
        r => r.city.toLowerCase().trim() === selectedCity.toLowerCase().trim() && r.isActive
      );
      if (cityRate) return cityRate.cost;
    }

    if (!selectedCity) return null;

    // Default fallback
    return storeSettings?.defaultShippingCost ?? 200;
  }, [effectiveSubtotal, selectedCity, shippingRates, storeSettings]);

  const couponDiscountAmount = isBuyNow ? 0 : (cartDiscount || 0);
  const quoteItems = useMemo(
    () =>
      checkoutItems.map((item) => {
        const variant = 'variant' in item ? (item as { variant?: string }).variant : undefined;
        return { productId: item.product._id, quantity: item.quantity, ...(variant ? { variant } : {}) };
      }),
    [checkoutItems]
  );
  const { data: quote } = useQuery({
    queryKey: ['checkout-quote', quoteItems, debouncedCity, isBuyNow ? null : couponCode, walletWanted, pointsWanted, refCode, isAuthenticated, pickupId],
    queryFn: () =>
      memberApi.quote({
        items: quoteItems,
        city: debouncedCity || undefined,
        couponCode: !isBuyNow && couponCode ? couponCode : undefined,
        refCode,
        walletAmount: walletWanted || undefined,
        pointsToRedeem: pointsWanted || undefined,
        pickupPointId: pickupId || undefined,
      }),
    enabled: quoteItems.length > 0,
    placeholderData: (prev) => prev,
    retry: false,
  });

  const quoteShipping = quote ? quote.shippingCost : calculatedShipping;
  const total = quote ? quote.total : Math.max(0, effectiveSubtotal + (calculatedShipping ?? 0) - couponDiscountAmount);
  const amountDue = quote ? quote.amountDue : total;
  const paidByWallet = !!quote && quote.walletUsed > 0 && quote.amountDue === 0;

  const onSubmit = async (data: CheckoutFormData) => {
    if (checkoutItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      const payload: any = {
        shippingAddress: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
        paymentMethod: paidByWallet ? 'wallet' : data.paymentMethod,
        notes: data.notes,
        refCode,
        walletAmount: quote?.walletUsed || undefined,
        pointsToRedeem: quote?.pointsRedeemed || undefined,
        pickupPointId: pickupId || undefined,
      };

      if (!isAuthenticated) {
        payload.guestInfo = {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        };
      }

      if (isBuyNow) {
        payload.items = checkoutItems.map(item => ({
          productId: item.product._id,
          quantity: item.quantity,
          price: item.price
        }));
      } else {
        payload.couponCode = couponCode || undefined;
        // The backend knows how to fetch items from the active user's cart if `items` is not provided and the user is authenticated.
        // But for guest checkout using the cart, we need to pass items.
        if (!isAuthenticated) {
          payload.items = checkoutItems.map(item => ({
            productId: item.product._id,
            quantity: item.quantity,
            price: item.price
          }));
        }
      }

      const order = await orderApi.create(payload);
      
      if (!isBuyNow) {
        dispatch(clearCart());
      }

      router.push(`/checkout/success?orderId=${order._id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Checkout failed. Please try again.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isBuyNow && isLoadingBuyNow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="animate-pulse text-gray-500">Preparing checkout...</div>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold mb-2">Your cart is empty</h1>
          <Link href="/shop">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href={isBuyNow ? `/products/${buyNowProduct?.slug}` : "/cart"} className="inline-flex items-center gap-2 text-gray-600 hover:text-rose-gold mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to {isBuyNow ? 'product' : 'cart'}
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-6 md:p-8 space-y-8">
                {/* Header */}
                <div>
                  <h1 className="text-3xl font-serif font-bold text-black">Secure Checkout</h1>
                  <p className="text-gray-500 mt-1 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-600" /> 256-bit SSL encryption
                  </p>
                </div>

                {/* Contact Information */}
                <div>
                  <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-2 border-b pb-2">
                    <User className="w-5 h-5 text-rose-gold" /> Contact Information
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Input label="Email address" type="email" error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} />
                    </div>
                    <Input label="First name" error={errors.firstName?.message} {...register('firstName', { required: 'Required' })} />
                    <Input label="Last name" error={errors.lastName?.message} {...register('lastName', { required: 'Required' })} />
                    <div className="md:col-span-2">
                      <Input label="Phone number" error={errors.phone?.message} {...register('phone', { required: 'Required' })} />
                    </div>
                  </div>
                </div>

                {/* Delivery or pickup */}
                {pickupPoints.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xl font-serif font-semibold mb-1 flex items-center gap-2 border-b pb-2">
                      <Truck className="w-5 h-5 text-rose-gold" /> Delivery
                    </h2>
                    <label className="flex items-start gap-3 p-4 border border-gray-200 cursor-pointer">
                      <input type="radio" name="delivery" className="mt-1" checked={!pickupId} onChange={() => setPickupId('')} />
                      <div>
                        <p className="font-medium text-gray-900">Home delivery</p>
                        <p className="text-sm text-gray-500">Delivered to your address in 3 to 5 working days</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-4 border border-gray-200 cursor-pointer">
                      <input
                        type="radio"
                        name="delivery"
                        className="mt-1"
                        checked={!!pickupId}
                        onChange={() => {
                          const p = pickupPoints[0];
                          setPickupId(p._id);
                          setValue('street', `Pickup: ${p.name}, ${p.address}`);
                          setValue('city', p.city);
                          setValue('state', p.city);
                          setValue('postalCode', '00000');
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Pick up from a store (free)</p>
                        {pickupId ? (
                          <select
                            value={pickupId}
                            onChange={(e) => {
                              const p = pickupPoints.find((x) => x._id === e.target.value)!;
                              setPickupId(p._id);
                              setValue('street', `Pickup: ${p.name}, ${p.address}`);
                              setValue('city', p.city);
                              setValue('state', p.city);
                            }}
                            className="mt-2 w-full border border-gray-300 px-3 py-2 text-sm"
                          >
                            {pickupPoints.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}, {p.city}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm text-gray-500">Collect from one of our {pickupPoints.length} pickup point{pickupPoints.length === 1 ? '' : 's'}</p>
                        )}
                        {pickupId && (() => {
                          const p = pickupPoints.find((x) => x._id === pickupId);
                          return p ? <p className="mt-2 text-sm text-gray-600">{p.address}{p.hours ? ` · ${p.hours}` : ''}{p.phone ? ` · ${p.phone}` : ''}</p> : null;
                        })()}
                      </div>
                    </label>
                  </div>
                )}

                {/* Shipping Address */}
                <div className={pickupId ? 'hidden' : ''}>
                  <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-2 border-b pb-2">
                    <MapPin className="w-5 h-5 text-rose-gold" /> Shipping Address
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Country" error={errors.country?.message} {...register('country', { required: 'Required' })} readOnly className="bg-gray-50" />
                    <Input label="City" error={errors.city?.message} {...register('city', { required: 'Required' })} />
                    <div className="md:col-span-2">
                      <Input label="Street address" error={errors.street?.message} {...register('street', { required: 'Required' })} />
                    </div>
                    <Input label="State / Province" error={errors.state?.message} {...register('state', { required: 'Required' })} />
                    <Input label="Postal code" error={errors.postalCode?.message} {...register('postalCode', { required: 'Required' })} />
                  </div>
                </div>

                {/* Wallet and loyalty points */}
                {isAuthenticated && quote && (quote.walletAvailable > 0 || quote.pointsBalance >= quote.minRedeemPoints) && (
                  <div className="space-y-3">
                    {quote.walletAvailable > 0 && (
                      <label className="flex items-start gap-4 p-4 border border-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={walletWanted > 0}
                          onChange={(e) => setWalletWanted(e.target.checked ? quote.walletAvailable : 0)}
                        />
                        <Wallet className="w-5 h-5 mt-0.5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">Use my wallet balance</p>
                          <p className="text-sm text-gray-500">
                            {formatPrice(quote.walletAvailable)} available{quote.walletUsed > 0 ? `, ${formatPrice(quote.walletUsed)} applied` : ''}
                          </p>
                        </div>
                      </label>
                    )}
                    {quote.pointsBalance >= quote.minRedeemPoints && (
                      <label className="flex items-start gap-4 p-4 border border-gray-200 cursor-pointer">
                        <input type="checkbox" className="mt-1" checked={pointsWanted > 0} onChange={(e) => setPointsWanted(e.target.checked ? quote.pointsBalance : 0)} />
                        <Sparkles className="w-5 h-5 mt-0.5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">Redeem my loyalty points</p>
                          <p className="text-sm text-gray-500">
                            {quote.pointsBalance} points{quote.pointsValue > 0 ? `, worth ${formatPrice(quote.pointsValue)} off this order` : ''}
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                )}

                {/* Payment Method */}
                {paidByWallet ? (
                  <p className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">Your wallet covers this order in full. No further payment needed.</p>
                ) : (
                <div>
                  <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-2 border-b pb-2">
                    <Lock className="w-5 h-5 text-rose-gold" /> Payment Method
                  </h2>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const selected = paymentMethod === method.id;
                      return (
                        <label
                          key={method.id}
                          className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                            selected ? 'border-rose-gold bg-rose-gold/5 shadow-sm' : 'border-gray-200 hover:border-rose-gold/40'
                          }`}
                        >
                          <input type="radio" value={method.id} className="mt-1 text-rose-gold focus:ring-rose-gold" {...register('paymentMethod')} />
                          <Icon className={`w-5 h-5 mt-0.5 ${selected ? 'text-rose-gold' : 'text-gray-500'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{method.name}</p>
                            <p className="text-sm text-gray-500">{method.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
                )}

                {account && !paidByWallet && (
                  <ManualPaymentCard account={account} amountLabel={formatPrice(amountDue)} />
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Order notes (optional)</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-gold"
                    rows={3}
                    placeholder="Notes about your order, e.g. special notes for delivery."
                    {...register('notes')}
                  />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 font-medium">{error}</p>}
              </div>

              {/* Submit Area */}
              <div className="bg-gray-50 p-6 md:p-8 border-t border-gray-200">
                <Button type="submit" className="w-full py-4 text-lg font-medium" loading={isProcessing} size="lg">
                  {paidByWallet ? 'Place order (paid from wallet)' : paymentMethod === 'cod' ? 'Complete Order (Cash on Delivery)' : 'Place Order & Pay Securely'}
                </Button>
                {paymentMethod === 'cod' && !paidByWallet && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    You will pay {formatPrice(amountDue)} upon delivery.
                  </p>
                )}
              </div>
            </motion.form>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="font-serif text-xl font-semibold mb-6 pb-4 border-b">Order Summary</h2>
              
              <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {checkoutItems.map((item, index) => (
                  <div key={`${item.product._id}-${(item as any).variant || index}`} className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                      <img src={item.product.images?.[0]?.url || '/placeholder.png'} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h4>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="flex items-center text-sm font-medium">
                      {formatPrice(quote?.items[index]?.total ?? item.total)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium text-gray-900">{formatPrice(originalSubtotal)}</span></div>
                {quote && quote.memberDiscount > 0 && (
                  <div className="flex justify-between text-sale font-medium">
                    <span>{quote.buyerType === 'business' ? 'Wholesale prices' : `Partner discount (${quote.discountPct}%)`}</span>
                    <span>-{formatPrice(quote.memberDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="font-medium text-gray-900">{quoteShipping === null ? '—' : quoteShipping === 0 ? <span className="text-green-600">Free</span> : formatPrice(quoteShipping)}</span>
                </div>
                {productDiscount + (quote ? quote.discount : couponDiscountAmount) > 0 && (
                  <div className="flex justify-between text-rose-gold font-medium"><span>Discount</span><span>-{formatPrice(productDiscount + (quote ? quote.discount : couponDiscountAmount))}</span></div>
                )}
                {quote?.couponError && <p className="text-xs text-sale">{quote.couponError}</p>}
                {quote && quote.pointsValue > 0 && (
                  <div className="flex justify-between text-gray-600"><span>Loyalty points ({quote.pointsRedeemed})</span><span>-{formatPrice(quote.pointsValue)}</span></div>
                )}
                <div className="flex justify-between text-xl font-bold pt-4 border-t mt-4 text-black">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                {quote && quote.walletUsed > 0 && (
                  <>
                    <div className="flex justify-between text-gray-600"><span>Paid from wallet</span><span>-{formatPrice(quote.walletUsed)}</span></div>
                    <div className="flex justify-between font-semibold text-black"><span>To pay</span><span>{formatPrice(amountDue)}</span></div>
                  </>
                )}
                {quote?.notices.map((n) => <p key={n} className="text-xs text-gray-500">{n}</p>)}
                {quote && quote.pointsEarned > 0 && <p className="text-xs text-gray-500">You will earn {quote.pointsEarned} loyalty points when this order is delivered.</p>}
                {quote?.referredBy && <p className="text-xs text-gray-500">Shopping with {quote.referredBy}, Azeeora Brand Partner.</p>}
              </div>
              
              <div className="mt-6 bg-green-50 text-green-700 p-4 rounded-xl text-sm flex items-start gap-2 border border-green-100">
                <Check className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Buy with confidence. We offer a 100% satisfaction guarantee on all our products.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
