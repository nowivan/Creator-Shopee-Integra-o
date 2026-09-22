import React, { useRef } from 'react';
import { UploadedProductImage } from '../shared/types';
import { LucideIcon } from '../../../components/Common';

interface ProductUploadProps {
    productImage: UploadedProductImage | null;
    productName: string;
    productDescription?: string;
    onImageChange: (image: UploadedProductImage | null) => void;
    onNameChange: (name: string) => void;
    onDescriptionChange: (desc: string) => void;
    disabled?: boolean;
}

export const ProductUpload: React.FC<ProductUploadProps> = ({
    productImage,
    productName,
    productDescription = '',
    onImageChange,
    onNameChange,
    onDescriptionChange,
    disabled = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            onImageChange({
                file,
                dataUrl,
                name: file.name,
                size: file.size,
                type: file.type
            });

            // Automatically prefill product name if empty
            if (!productName) {
                const cleanName = file.name
                    .replace(/\.[^/.]+$/, "")
                    .replace(/[-_]/g, " ")
                    .replace(/\b\w/g, c => c.toUpperCase());
                onNameChange(cleanName);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <LucideIcon name="upload-cloud" className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-neutral-200">
                            Upload Product
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                            Envie a imagem principal do produto para o especialista analisar
                        </p>
                    </div>
                </div>

                {productImage && (
                    <button
                        type="button"
                        onClick={() => onImageChange(null)}
                        disabled={disabled}
                        className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                        <LucideIcon name="trash-2" className="w-3.5 h-3.5" /> Remover
                    </button>
                )}
            </div>

            {/* Dropzone & Preview */}
            {!productImage ? (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-neutral-700/70 hover:border-emerald-500/50 bg-[#0A0A0B]/60 hover:bg-emerald-950/10 rounded-xl p-6 transition-all flex flex-col items-center justify-center cursor-pointer text-center group ${
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                handleFile(e.target.files[0]);
                            }
                        }}
                    />
                    <div className="w-12 h-12 rounded-full bg-neutral-800/80 group-hover:bg-emerald-500/20 flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 mb-3 transition-colors">
                        <LucideIcon name="image-plus" className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-200 mb-1">
                        Arraste ou clique para carregar a imagem do produto
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono">
                        Formatos suportados: PNG, JPG, WebP (Máx. 10MB)
                    </p>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0A0A0B] border border-neutral-800 rounded-lg p-3">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                        <img
                            src={productImage.dataUrl}
                            alt={productImage.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400 flex items-center gap-0.5">
                            <LucideIcon name="check" className="w-2.5 h-2.5" /> OK
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-2 text-left">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-neutral-400 truncate max-w-[200px]">
                                {productImage.name}
                            </span>
                            {productImage.size && (
                                <span className="text-[10px] font-mono text-neutral-600">
                                    {(productImage.size / 1024).toFixed(1)} KB
                                </span>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                                Nome do Produto
                            </label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => onNameChange(e.target.value)}
                                disabled={disabled}
                                placeholder="Ex: Fone Bluetooth Pro Max..."
                                className="w-full bg-[#121214] border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                                Detalhes / Benefícios (Opcional)
                            </label>
                            <input
                                type="text"
                                value={productDescription}
                                onChange={(e) => onDescriptionChange(e.target.value)}
                                disabled={disabled}
                                placeholder="Ex: Cancelamento de ruído, bateria de 40h, design ergonômico..."
                                className="w-full bg-[#121214] border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
