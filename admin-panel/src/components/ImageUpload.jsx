import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api';

// Upload to Cloudinary through the API, or paste a URL.
const ImageUpload = ({ value, onChange, folder }) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error('Image must be under 3 MB');
    const body = new FormData();
    body.append('image', file);
    setUploading(true);
    try {
      const { data } = await api.post(`/uploads?folder=${folder}`, body);
      onChange(data.url);
      toast.success('Image uploaded');
    } catch (e) {
      toast.error(errorMessage(e, 'Upload failed'));
    } finally {
      setUploading(false);
      inputRef.current.value = '';
    }
  };

  return (
    <div className="image-upload">
      {value ? <img src={value} alt="" /> : <div className="image-placeholder">🖼️</div>}
      <div className="stack gap-8" style={{ flex: 1 }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" aria-label="Image URL" />
        <div className="row gap-8">
          <button type="button" className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => inputRef.current.click()}>
            {uploading ? 'Uploading…' : '⬆ Upload image'}
          </button>
          {value && <button type="button" className="link small" onClick={() => onChange('')}>Remove</button>}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={(e) => upload(e.target.files[0])} />
      </div>
    </div>
  );
};

export default ImageUpload;
