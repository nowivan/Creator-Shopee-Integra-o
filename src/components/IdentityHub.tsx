import React, { useState, useEffect, useRef } from 'react';
import { LucideIcon } from './Common';
import {
  AvatarReferenceProfile,
  createAvatarReferenceProfile,
  reanalyzeAvatarReferenceProfile,
  StoredAvatar,
  loadCanonicalAvatars,
  persistCanonicalAvatars,
  subscribeToAvatarUpdates
} from '../features/visual-reference-engine';
import { AvatarVisualDNAPanel } from './AvatarVisualDNAPanel';

export type { StoredAvatar };

const resizeImage = (dataUrl: string, maxWidth = 200, maxHeight = 200): Promise<string> => {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(dataUrl);
      }
    }, 800);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(img, 0, 0, width, height);
          const resized = canvas.toDataURL('image/jpeg', 0.85);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(resized);
          }
        } catch (e) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(dataUrl);
          }
        }
      } else {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(dataUrl);
        }
      }
    };
    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
};

interface IdentityHubProps {
  currentKey: string;
}

export function IdentityHub({ currentKey }: IdentityHubProps) {
  const [avatars, setAvatars] = useState<StoredAvatar[]>(() => {
    return loadCanonicalAvatars();
  });

  const [selectedAvatarId, setSelectedAvatarId] = useState<number | string | null>(() => {
    const saved = loadCanonicalAvatars();
    return saved.length > 0 ? saved[0].id : null;
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const [loadingId, setLoadingId] = useState(false);
  const [replacingId, setReplacingId] = useState<number | string | null>(null);
  const [cleanReferenceDefault, setCleanReferenceDefault] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load and same-tab / cross-tab synchronization
  useEffect(() => {
    const initial = loadCanonicalAvatars();
    setAvatars(initial);
    setIsHydrated(true);

    const unsubscribe = subscribeToAvatarUpdates((updated) => {
      setAvatars(updated);
    });

    return unsubscribe;
  }, []);

  // Ensure an avatar is selected if avatars exist
  useEffect(() => {
    if (avatars.length > 0) {
      if (!selectedAvatarId || !avatars.some((a) => String(a.id) === String(selectedAvatarId))) {
        setSelectedAvatarId(avatars[0].id);
      }
    } else {
      setSelectedAvatarId(null);
    }
  }, [avatars, selectedAvatarId]);

  // Global paste support
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!isFocused) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            e.preventDefault();
            uploadAvatar(pastedFile, cleanReferenceDefault);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isFocused, avatars, replacingId, currentKey, cleanReferenceDefault]);

  const uploadAvatar = async (file: File, shouldClean: boolean) => {
    if (!currentKey) {
      alert('Configure a Chave API nas configurações para analisar avatares.');
      return;
    }

    if (avatars.length >= 4 && replacingId === null) {
      alert('Limite de 4 avatares atingido. Substitua ou exclua um avatar existente.');
      return;
    }

    setLoadingId(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // Execute full Visual Reference Engine Stage 5 Pipeline
      const profile = await createAvatarReferenceProfile({
        image: dataUrl,
        cleanReference: shouldClean,
        apiKey: currentKey
      });

      const resizedPreviewUrl = await resizeImage(
        profile.cleanedImage || profile.originalImage,
        200,
        200
      );

      let nextAvatars: StoredAvatar[];
      let targetId: number | string;

      if (replacingId !== null) {
        targetId = replacingId;
        nextAvatars = avatars.map((a) =>
          String(a.id) === String(replacingId)
            ? {
                ...a,
                image: resizedPreviewUrl,
                masterPrompt: profile.identityPrompt,
                profile
              }
            : a
        );
      } else {
        targetId = Date.now();
        const newAvatar: StoredAvatar = {
          id: targetId,
          name: `Avatar ${avatars.length + 1}`,
          image: resizedPreviewUrl,
          masterPrompt: profile.identityPrompt,
          profile
        };
        nextAvatars = [...avatars, newAvatar];
      }

      // Atomic persistence check
      const persistResult = persistCanonicalAvatars(nextAvatars);
      if (!persistResult.success) {
        console.error('[IdentityHub] Persist error:', persistResult.error);
        alert('Erro ao salvar avatar: ' + (persistResult.error || 'Armazenamento local indisponível.'));
        return;
      }

      setAvatars(nextAvatars);
      setSelectedAvatarId(targetId);
    } catch (err: any) {
      console.error('[IdentityHub] Error processing avatar reference:', err);
      alert('Erro ao processar avatar com o Visual Reference Engine: ' + (err.message || err));
    } finally {
      setLoadingId(false);
      setReplacingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar(file, cleanReferenceDefault);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadAvatar(file, cleanReferenceDefault);
    }
  };

  const handleReanalyze = async (avatarId: number | string, cleanReference: boolean) => {
    const targetAvatar = avatars.find((a) => String(a.id) === String(avatarId));
    if (!targetAvatar) return;

    const sourceImage = targetAvatar.profile?.originalImage || targetAvatar.image;
    if (!sourceImage) {
      alert('Imagem de referência original não encontrada.');
      return;
    }

    setLoadingId(true);
    try {
      let updatedProfile: AvatarReferenceProfile;
      if (targetAvatar.profile) {
        updatedProfile = await reanalyzeAvatarReferenceProfile({
          profile: targetAvatar.profile,
          cleanReference,
          apiKey: currentKey
        });
      } else {
        updatedProfile = await createAvatarReferenceProfile({
          image: sourceImage,
          cleanReference,
          apiKey: currentKey
        });
      }

      const resizedPreviewUrl = await resizeImage(
        updatedProfile.cleanedImage || updatedProfile.originalImage || targetAvatar.image,
        200,
        200
      );

      const nextAvatars = avatars.map((a) =>
        String(a.id) === String(avatarId)
          ? {
              ...a,
              image: resizedPreviewUrl,
              masterPrompt: updatedProfile.identityPrompt,
              profile: updatedProfile
            }
          : a
      );

      const persistResult = persistCanonicalAvatars(nextAvatars);
      if (!persistResult.success) {
        alert('Erro ao salvar avatar reanalisado: ' + (persistResult.error || 'Falha de armazenamento.'));
        return;
      }

      setAvatars(nextAvatars);
    } catch (err: any) {
      console.error('[IdentityHub] Error reanalyzing avatar:', err);
      alert('Erro ao reanalisar avatar: ' + (err.message || err));
    } finally {
      setLoadingId(false);
    }
  };

  const deleteAvatar = (id: number | string) => {
    const nextAvatars = avatars.filter((a) => String(a.id) !== String(id));
    const persistResult = persistCanonicalAvatars(nextAvatars);
    if (!persistResult.success) {
      alert('Erro ao atualizar avatares após exclusão: ' + persistResult.error);
      return;
    }
    setAvatars(nextAvatars);
    if (String(selectedAvatarId) === String(id)) {
      setSelectedAvatarId(nextAvatars.length > 0 ? nextAvatars[0].id : null);
    }
  };

  const triggerReplace = (id: number | string) => {
    setReplacingId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const updateAvatarName = (id: number | string, newName: string) => {
    const nextAvatars = avatars.map((a) => (String(a.id) === String(id) ? { ...a, name: newName } : a));
    const persistResult = persistCanonicalAvatars(nextAvatars);
    if (!persistResult.success) {
      alert('Erro ao salvar novo nome do avatar: ' + persistResult.error);
      return;
    }
    setAvatars(nextAvatars);
  };

  const updateAvatarBrandMark = (id: number | string, brandMark: any) => {
    const nextAvatars = avatars.map((a) => {
      if (String(a.id) === String(id)) {
        const updatedProfile = a.profile
          ? { ...a.profile, brandMarkProfile: brandMark }
          : undefined;
        return {
          ...a,
          brandMarkProfile: brandMark,
          profile: updatedProfile
        };
      }
      return a;
    });
    const persistResult = persistCanonicalAvatars(nextAvatars);
    if (!persistResult.success) {
      alert('Erro ao salvar marca/logo do avatar: ' + persistResult.error);
      return;
    }
    setAvatars(nextAvatars);
  };

  const selectedAvatar = avatars.find((a) => String(a.id) === String(selectedAvatarId));

  return (
    <div
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      className="space-y-6 animate-fade-in"
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileInput}
        className="hidden"
        accept="image/*"
      />

      {/* TOP HUB HEADER */}
      <div className="p-5 md:p-6 rounded-3xl border border-indigo-500/30 bg-[#0a0f2c] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white shadow-lg shadow-indigo-500/20">
                <LucideIcon name="user-check" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  <span>IDENTITY HUB</span>
                  <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    STAGE 5 VISUAL DNA
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gerencie atores e modelos visuais consistentes com decomposição biométrica desacoplada.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {avatars.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Deseja realmente limpar todos os avatares?')) {
                      setAvatars([]);
                      setSelectedAvatarId(null);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/20 font-bold transition"
                >
                  Limpar Tudo
                </button>
              )}
              <span className="text-xs text-indigo-300 bg-indigo-900/40 px-3.5 py-1.5 rounded-full border border-indigo-500/40 font-bold">
                {avatars.length}/4 SLOTS OCUPADOS
              </span>
            </div>
          </div>

          {/* AVATAR SLOTS ROW */}
          <div className="flex flex-wrap gap-5 items-center pt-2 pb-2">
            {/* Add New Avatar Button (if under 4) */}
            {avatars.length < 4 && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => {
                    setReplacingId(null);
                    fileInputRef.current?.click();
                  }}
                  disabled={loadingId && replacingId === null}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 flex items-center justify-center text-slate-500 hover:text-indigo-400 transition-all group relative bg-slate-900/60 shadow-inner"
                  title="Adicionar Novo Avatar"
                >
                  {loadingId && replacingId === null ? (
                    <LucideIcon name="loader-2" className="w-7 h-7 animate-spin text-indigo-400" />
                  ) : (
                    <LucideIcon
                      name="plus"
                      className="w-7 h-7 group-hover:scale-110 transition-transform"
                    />
                  )}
                </button>
                <span className="text-[11px] text-slate-400 font-medium">Novo Ator</span>
              </div>
            )}

            {/* List Existing Avatars */}
            {avatars.map((avatar) => {
              const isSelected = avatar.id === selectedAvatarId;
              const isThisLoading = loadingId && (replacingId === avatar.id || selectedAvatarId === avatar.id);

              return (
                <div
                  key={avatar.id}
                  onClick={() => setSelectedAvatarId(avatar.id)}
                  className={`flex flex-col items-center cursor-pointer transition-all ${
                    isSelected ? 'scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="relative w-20 h-20">
                    <div
                      className={`w-full h-full rounded-2xl p-0.5 transition-all shadow-lg ${
                        isSelected
                          ? 'bg-gradient-to-tr from-emerald-400 via-indigo-500 to-sky-400 shadow-indigo-500/40 ring-2 ring-indigo-400/50'
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                    >
                      <img
                        referrerPolicy="no-referrer"
                        src={avatar.image}
                        alt={avatar.name}
                        className={`w-full h-full rounded-[14px] object-cover bg-slate-900 ${
                          isThisLoading ? 'opacity-30 grayscale' : ''
                        }`}
                      />
                    </div>

                    {isThisLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <LucideIcon
                          name="loader-2"
                          className="w-6 h-6 text-white animate-spin drop-shadow-md"
                        />
                      </div>
                    )}

                    {/* Quick action buttons on avatar card */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-900/90 backdrop-blur p-1 rounded-full border border-slate-700 shadow-xl z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerReplace(avatar.id);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-1 transition hover:scale-110"
                        title="Substituir Foto"
                      >
                        <LucideIcon name="refresh-cw" className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAvatar(avatar.id);
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white rounded-full p-1 transition hover:scale-110"
                        title="Excluir"
                      >
                        <LucideIcon name="trash-2" className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold text-center truncate w-20 mt-3 px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-indigo-950 text-indigo-200 border border-indigo-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    {avatar.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick upload dropzone if no avatars exist */}
          {avatars.length === 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-indigo-400 bg-indigo-950/40'
                  : 'border-slate-700/80 bg-slate-900/40 hover:border-indigo-500/60 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <LucideIcon name="upload-cloud" className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Carregar Imagem de Referência do Avatar</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Arraste uma foto, cole da área de transferência (Ctrl+V) ou clique para selecionar.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cleanReferenceDefault}
                      onChange={(e) => setCleanReferenceDefault(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-600 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Limpar referência ao analisar (Reference Cleaner)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SELECTED AVATAR VISUAL DNA PANEL */}
      {selectedAvatar && (
        <AvatarVisualDNAPanel
          key={selectedAvatar.id}
          profile={selectedAvatar.profile}
          originalImage={selectedAvatar.profile?.originalImage || selectedAvatar.image}
          avatarName={selectedAvatar.name}
          isAnalyzing={loadingId}
          onReanalyze={(cleanReference) => handleReanalyze(selectedAvatar.id, cleanReference)}
          onReplaceImage={() => triggerReplace(selectedAvatar.id)}
          onDelete={() => deleteAvatar(selectedAvatar.id)}
          onUpdateName={(newName) => updateAvatarName(selectedAvatar.id, newName)}
          onUpdateBrandMark={(newBrandMark) => updateAvatarBrandMark(selectedAvatar.id, newBrandMark)}
        />
      )}
    </div>
  );
}
