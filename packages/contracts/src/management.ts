import { z } from 'zod';
const label=(min:number,max:number)=>z.string().trim().min(min,`حداقل ${min} نویسه وارد کنید.`).max(max,`حداکثر ${max} نویسه مجاز است.`);
const safeUrl=z.string().trim().max(500).refine(v=>!v||/^https?:\/\//i.test(v),'نشانی منبع باید با http یا https شروع شود.');
export const managedField=z.object({
 name:z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),label:label(1,100),
 type:z.enum(['text','textarea','select','radio','number','tel']),required:z.boolean().optional(),
 helper:label(0,300).optional(),placeholder:label(0,200).optional(),
 options:z.array(z.object({value:label(1,60),label:label(1,100)})).max(30).optional(),
 minLength:z.number().int().min(0).max(2000).optional(),maxLength:z.number().int().min(1).max(2000).optional(),
 pattern:z.string().max(50).refine(v=>/^\^\\d\{\d{1,2}(,\d{1,2})?\}\$$/.test(v),'فقط الگوی تعداد رقم محدود پشتیبانی می‌شود.').optional(),
 patternMessage:label(1,200).optional(),sensitive:z.boolean().optional(),
}).superRefine((f,ctx)=>{
 if(f.minLength&&f.maxLength&&f.minLength>f.maxLength)ctx.addIssue({code:'custom',message:'حداقل طول از حداکثر بیشتر است.',path:['minLength']});
 if(['select','radio'].includes(f.type)&&!f.options?.length)ctx.addIssue({code:'custom',message:'گزینه‌های انتخاب را وارد کنید.',path:['options']});
 if(f.options&&new Set(f.options.map(o=>o.value)).size!==f.options.length)ctx.addIssue({code:'custom',message:'گزینه تکراری مجاز نیست.',path:['options']});
});
export const managedForm=z.object({fields:z.array(managedField).max(20)}).superRefine((form,ctx)=>{
 if(new Set(form.fields.map(f=>f.name)).size!==form.fields.length)ctx.addIssue({code:'custom',message:'نام فیلدها تکراری است.',path:['fields']});
});
export const serviceManagementBody=z.object({
 title:label(3,140).optional(),shortTitle:label(2,45).optional(),description:label(10,2000).optional(),
 status:z.enum(['active_demo','informational','coming_soon','disabled']).optional(),
 slaHours:z.number().int().min(1).max(2160).nullable().optional(),isFeatured:z.boolean().optional(),
 requirements:z.array(label(1,300)).max(20).optional(),steps:z.array(label(1,300)).max(20).optional(),
 keywords:z.array(label(1,60)).max(30).optional(),form:managedForm.optional(),
}).refine(v=>Object.keys(v).length>0,'تغییری وارد نشده است.');
export const managedAnnouncementCreate=z.object({
 title:label(5,140),body:label(10,4000),sourceName:label(2,120),sourceUrl:safeUrl.optional(),
 importance:z.enum(['normal','important']).default('normal'),organizationId:z.uuid().nullable().optional(),expiresAt:z.iso.datetime().nullable().optional(),
});
export const managedAnnouncementUpdate=managedAnnouncementCreate.partial().extend({status:z.enum(['draft','published','archived']).optional()}).refine(v=>Object.keys(v).length>0,'تغییری وارد نشده است.');
