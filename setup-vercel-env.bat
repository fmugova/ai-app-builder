@echo off
echo Adding missing NEXT_PUBLIC environment variables to Vercel...
echo.

echo Adding NEXT_PUBLIC_STRIPE_PRO_PRICE_ID...
echo price_1SYaBjC8WSP1936WrOHxrAms | vercel env add NEXT_PUBLIC_STRIPE_PRO_PRICE_ID production

echo Adding NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID...
echo price_1SYaDrC8WSP1936WdTbWFrBk | vercel env add NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID production

echo Adding NEXT_PUBLIC_APP_URL...
echo https://buildflow-ai.app | vercel env add NEXT_PUBLIC_APP_URL production

echo Adding NEXT_PUBLIC_APP_NAME...
echo BuildFlow | vercel env add NEXT_PUBLIC_APP_NAME production

echo.
echo Done! Now trigger a redeployment in Vercel dashboard or run: vercel --prod
pause
