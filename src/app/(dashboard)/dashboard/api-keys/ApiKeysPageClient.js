"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Button from "@/shared/components/Button";
import { Modal } from "@/shared/components/Modal";

// Utility function for formatting reset time (client-safe)
function formatResetTime(isoString) {
  if (!isoString) return 'N/A';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `in ${diffHours}h`;
  }
  
  return date.toLocaleString();
}

export default function ApiKeysPageClient({ machineId }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [quotaDailyLimit, setQuotaDailyLimit] = useState("");
  const [quotaMonthlyLimit, setQuotaMonthlyLimit] = useState("");
  const [createdKey, setCreatedKey] = useState(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      
      if (!res.ok) throw new Error("Failed to create key");
      
      const data = await res.json();
      setCreatedKey(data);
      fetchKeys();
    } catch (error) {
      console.error("Failed to create API key:", error);
      alert("Failed to create API key");
    }
  };

  const handleDeleteKey = async (id, name) => {
    if (!confirm(`Are you sure you want to delete API key "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete key");
      
      fetchKeys();
    } catch (error) {
      console.error("Failed to delete API key:", error);
      alert("Failed to delete API key");
    }
  };

  const handleSetQuota = async (e) => {
    e.preventDefault();
    if (!selectedKey) return;

    try {
      const res = await fetch(`/api/keys/${selectedKey.id}/quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyLimit: dailyLimit ? parseInt(dailyLimit) : null,
          monthlyLimit: monthlyLimit ? parseInt(monthlyLimit) : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to set quota");
      }

      fetchKeys();
      setShowQuotaModal(false);
      setSelectedKey(null);
      setQuotaDailyLimit("");
      setQuotaMonthlyLimit("");
    } catch (error) {
      console.error("Failed to set quota:", error);
      alert(`Failed to set quota: ${error.message}`);
    }
  };

  const openQuotaModal = (key) => {
    setSelectedKey(key);
    setQuotaDailyLimit(key.quota?.dailyLimit || "");
    setQuotaMonthlyLimit(key.quota?.monthlyLimit || "");
    setShowQuotaModal(true);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Manage API keys and usage quotas for sharing models with others
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <span className="material-icons text-sm mr-1">add</span>
          Create API Key
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="material-icons text-blue-600 text-xl">info</span>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How API Keys Work:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Share different API keys with different users</li>
              <li>Set daily/monthly request quotas per key</li>
              <li>Quotas reset automatically at midnight UTC</li>
              <li>Users connect with: <code className="bg-blue-100 px-2 py-0.5 rounded">Authorization: Bearer sk-...</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                API Key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quota (Daily / Monthly)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {keys.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No API keys yet. Create your first API key to get started.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{key.name}</div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {key.key.slice(0, 16)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy full key"
                      >
                        <span className="material-icons text-sm">content_copy</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {key.quota?.dailyLimit || key.quota?.monthlyLimit ? (
                      <div className="text-sm text-gray-900">
                        {key.quota?.dailyLimit ? (
                          <div>Daily: {key.quota.dailyLimit.toLocaleString()}</div>
                        ) : null}
                        {key.quota?.monthlyLimit ? (
                          <div>Monthly: {key.quota.monthlyLimit.toLocaleString()}</div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unlimited</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {key.quota ? (
                      <div className="text-sm text-gray-900">
                        {key.quota.dailyLimit ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                              <div
                                className={`h-2 rounded-full ${
                                  (key.quota.dailyUsed || 0) >= (key.quota.dailyLimit || 1)
                                    ? "bg-red-500"
                                    : (key.quota.dailyUsed || 0) > (key.quota.dailyLimit || 1) * 0.8
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width: `${Math.min(100, ((key.quota.dailyUsed || 0) / (key.quota.dailyLimit || 1)) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {key.quota.dailyUsed || 0} / {key.quota.dailyLimit}
                            </span>
                          </div>
                        ) : null}
                        {key.quota.monthlyLimit ? (
                          <div className="text-xs text-gray-600 mt-1">
                            Monthly: {key.quota.monthlyUsed || 0} / {key.quota.monthlyLimit}
                          </div>
                        ) : null}
                        {key.quota.resetAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Resets: {formatResetTime(key.quota.resetAt)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      key.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {key.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openQuotaModal(key)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <span className="material-icons text-sm">data_usage</span>
                        Quota
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key.id, key.name)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <span className="material-icons text-sm">delete</span>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setNewKeyName("");
            setCreatedKey(null);
          }}
          title="Create New API Key"
        >
          {!createdKey ? (
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., User A, Team B, Project X"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Key</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-2">
                  ✅ API Key Created Successfully!
                </p>
                <p className="text-xs text-green-700 mb-2">
                  ⚠️ Copy this key now - it won't be shown again!
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-green-300 text-sm font-mono">
                    {createdKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdKey.key)}
                    className="text-green-600 hover:text-green-800 p-2"
                    title="Copy to clipboard"
                  >
                    <span className="material-icons">content_copy</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => {
                  setShowCreateModal(false);
                  setCreatedKey(null);
                  setNewKeyName("");
                }}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Set Quota Modal */}
      {showQuotaModal && selectedKey && (
        <Modal
          isOpen={showQuotaModal}
          onClose={() => {
            setShowQuotaModal(false);
            setSelectedKey(null);
          }}
          title={`Set Quota: ${selectedKey.name}`}
        >
          <form onSubmit={handleSetQuota} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Note:</span> Leave fields empty for unlimited. 
                Quotas reset at midnight UTC.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Request Limit
              </label>
              <input
                type="number"
                min="0"
                value={quotaDailyLimit}
                onChange={(e) => setQuotaDailyLimit(e.target.value)}
                placeholder="Leave empty for unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedKey.quota?.dailyUsed !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Current usage: {selectedKey.quota.dailyUsed} requests today
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Request Limit
              </label>
              <input
                type="number"
                min="0"
                value={quotaMonthlyLimit}
                onChange={(e) => setQuotaMonthlyLimit(e.target.value)}
                placeholder="Leave empty for unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedKey.quota?.monthlyUsed !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Current usage: {selectedKey.quota.monthlyUsed} requests this month
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowQuotaModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Quota</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

ApiKeysPageClient.propTypes = {
  machineId: PropTypes.string.isRequired,
};
