import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ThemeToggle } from '@/components/ThemeToggle'

const formSchema = z.object({
  query: z.string().min(1, 'Please enter a topic or ArXiv link.'),
  knowledgeLevel: z.enum(['beginner', 'intermediate', 'advanced']),
})

export const LandingPage = () => {
  const { setStep, setQuery, setKnowledgeLevel } = useApp()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      query: '',
      knowledgeLevel: 'beginner',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    setQuery(values.query)
    setKnowledgeLevel(values.knowledgeLevel)
    setStep('loading')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            ArXiv Visual Explainer
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Transform dense research papers into easy-to-understand
            infographics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-md font-semibold">
                      What research topic do you want to understand?
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Transformer architecture attention mechanisms or paste an ArXiv link"
                        className="text-lg p-6"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="knowledgeLevel"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-md font-semibold">
                      Select your knowledge level
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        <Label
                          htmlFor="beginner"
                          className="flex items-center space-x-3 rounded-md border p-4 hover:bg-accent cursor-pointer"
                        >
                          <FormControl>
                            <RadioGroupItem value="beginner" id="beginner" />
                          </FormControl>
                          <div className="space-y-1">
                            <div className="font-normal">Beginner (ELI5)</div>
                            <p className="text-xs text-muted-foreground">
                              Friendly, analogies, no jargon
                            </p>
                          </div>
                        </Label>
                        <Label
                          htmlFor="intermediate"
                          className="flex items-center space-x-3 rounded-md border p-4 hover:bg-accent cursor-pointer"
                        >
                          <FormControl>
                            <RadioGroupItem
                              value="intermediate"
                              id="intermediate"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <div className="font-normal">Intermediate</div>
                            <p className="text-xs text-muted-foreground">
                              Professional, some technical terms
                            </p>
                          </div>
                        </Label>
                        <Label
                          htmlFor="advanced"
                          className="flex items-center space-x-3 rounded-md border p-4 hover:bg-accent cursor-pointer"
                        >
                          <FormControl>
                            <RadioGroupItem value="advanced" id="advanced" />
                          </FormControl>
                          <div className="space-y-1">
                            <div className="font-normal">Advanced</div>
                            <p className="text-xs text-muted-foreground">
                              Academic, full technical vocabulary
                            </p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full text-lg py-6">
                Generate Visual Explainer
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
