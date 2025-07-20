import React, { useState, useEffect } from 'react';
import { History, Phone, Clock, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrderItem {
  dish_id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone?: string;
  table_number: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  order_time: string;
  notes?: string;
}

interface CustomerHistoryProps {
  restaurantId: string;
  onAddToCart: (item: OrderItem) => void;
  onClose: () => void;
}

export default function CustomerHistory({ restaurantId, onAddToCart, onClose }: CustomerHistoryProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const searchCustomerHistory = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('customer_phone', cleanPhone)
        .order('order_time', { ascending: false });

      if (error) {
        console.error('Error fetching customer history:', error);
        setError('Failed to load order history');
        return;
      }

      setCustomerOrders(orders || []);
      setShowHistory(true);
    } catch (error) {
      console.error('Error fetching customer history:', error);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const handleReOrder = (order: Order) => {
    // Add all items from the selected order to cart
    order.items.forEach(item => {
      onAddToCart(item);
    });
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'ready':
        return 'text-blue-600';
      case 'preparing':
        return 'text-yellow-600';
      case 'pending':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4" />;
      case 'preparing':
        return <RefreshCw className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <History className="w-6 h-6 text-black" />
              <h2 className="text-2xl font-bold text-black">Order History</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>

          {!showHistory ? (
            /* Phone Number Input */
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Enter your phone number to view your previous orders
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  placeholder="Enter your phone number"
                  maxLength={10}
                />
                {error && (
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                )}
              </div>

              <button
                onClick={searchCustomerHistory}
                disabled={loading || !phoneNumber.trim()}
                className="w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4" />
                    <span>View Order History</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Order History Display */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-black">
                    Order History for {phoneNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {customerOrders.length} previous order{customerOrders.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setCustomerOrders([]);
                    setPhoneNumber('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Search Different Number
                </button>
              </div>

              {customerOrders.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Previous Orders</h4>
                  <p className="text-gray-600">
                    No orders found for this phone number. Please check the number and try again.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {customerOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                              <Clock className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-black">
                                Order #{order.id.slice(-8)}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {formatDate(order.order_time)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${getStatusColor(order.status)} flex items-center space-x-1`}>
                            {getStatusIcon(order.status)}
                            <span className="capitalize">{order.status}</span>
                          </span>
                          <span className="text-lg font-bold text-black">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-medium text-black">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Order Details */}
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                        <span>Table {order.table_number}</span>
                        {order.notes && (
                          <span className="italic">"{order.notes}"</span>
                        )}
                      </div>

                      {/* Re-order Button */}
                      <button
                        onClick={() => handleReOrder(order)}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Re-order This Meal
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 