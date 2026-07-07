import { RouterProvider } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'motion/react';
import { router } from './routes';

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <RouterProvider router={router} />
    </LazyMotion>
  );
}
